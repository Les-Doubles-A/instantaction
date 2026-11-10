// Palette de commandes : recherche instantanée, utilisable entièrement au clavier.
import { obtenirUi, toast } from './ui.js';
import { construireContexte } from './context-detector.js';
import { getActionsForContext, estCompatible, estActive } from '../shared/commands.js';
import { lireHistorique, ajouterNote, sauverReglages } from '../shared/storage.js';
import { capturerSelection, restaurerSelection, normaliser, genererId, nomDuSite } from '../shared/utils.js';
import { LIBELLES_CONTEXTES } from '../shared/types.js';

function el(balise, classe, texte) {
  const e = document.createElement(balise);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

function score(action, requete) {
  const mots = requete.split(/\s+/).filter(Boolean);
  const nom = normaliser(action.name);
  const meta = normaliser([action.description, ...(action.keywords || [])].join(' '));
  let total = 0;
  for (const mot of mots) {
    if (nom.split(/[\s’']+/).some((m) => m.startsWith(mot))) total += 100;
    else if (nom.includes(mot)) total += 60;
    else if (meta.includes(mot)) total += 25;
    else return 0;
  }
  return total;
}

export function creerPalette({ obtenirReglages, obtenirRegistre, obtenirCible, executer, surOuverture }) {
  let ouverte = false;
  let fond, saisie, liste, ctx, cap, mode, entrees, index, recents;

  async function ouvrir({ mode: modeDemande = 'actions' } = {}) {
    if (ouverte) return; // idempotent : un double déclenchement ne referme pas la palette
    ouverte = true;
    surOuverture?.();
    mode = modeDemande;
    cap = capturerSelection();
    ctx = construireContexte(obtenirCible());
    const reglages = obtenirReglages();
    recents = [];
    if (reglages.historiqueActif && mode !== 'note') {
      recents = [...new Set((await lireHistorique()).reverse().map((h) => h.id))];
    }
    const c = await obtenirUi();

    fond = el('div', 'ia-fond');
    const boite = el('div', 'ia-palette');
    boite.setAttribute('role', 'dialog');
    boite.setAttribute('aria-modal', 'true');
    boite.setAttribute('aria-label', 'InstantAction');
    const entete = el('div', 'ia-entete');
    saisie = el('input', 'ia-saisie');
    saisie.type = 'text';
    saisie.autocomplete = 'off';
    saisie.spellcheck = false;
    saisie.placeholder = mode === 'note' ? 'Écrivez une note… (Entrée pour enregistrer)' : 'Tapez une commande…';
    saisie.setAttribute('role', 'combobox');
    saisie.setAttribute('aria-expanded', 'true');
    saisie.setAttribute('aria-controls', 'ia-liste');
    saisie.setAttribute('aria-autocomplete', 'list');
    saisie.setAttribute('aria-label', mode === 'note' ? 'Nouvelle note' : 'Rechercher une action');
    const badge = el('span', 'ia-badge', mode === 'note' ? 'Note' : LIBELLES_CONTEXTES[ctx.type] || 'Page');
    entete.append(saisie, badge);
    liste = el('ul', 'ia-liste');
    liste.id = 'ia-liste';
    liste.setAttribute('role', 'listbox');
    const pied = el('div', 'ia-pied', mode === 'note' ? 'Entrée : enregistrer · Échap : fermer' : '↑↓ naviguer · Entrée exécuter · Échap fermer');
    boite.append(entete, liste, pied);
    fond.appendChild(boite);
    c.appendChild(fond);

    fond.addEventListener('mousedown', (e) => { if (e.target === fond) fermer(); });
    // Les touches saisies dans la palette ne doivent pas atteindre les raccourcis du site.
    ['keydown', 'keyup', 'keypress'].forEach((nom) => fond.addEventListener(nom, (e) => e.stopPropagation()));
    saisie.addEventListener('input', () => { index = 0; rafraichir(); });
    saisie.addEventListener('keydown', surTouche);

    index = 0;
    rafraichir();
    saisie.focus();
  }

  function fermer() {
    if (!ouverte) return;
    ouverte = false;
    fond.remove();
    restaurerSelection(cap); // remet le focus et la sélection d'origine
  }

  function surTouche(e) {
    const total = entrees.length;
    if (e.key === 'Escape') { e.preventDefault(); fermer(); }
    else if (e.key === 'ArrowDown' && total) { e.preventDefault(); selectionner((index + 1) % total); }
    else if (e.key === 'ArrowUp' && total) { e.preventDefault(); selectionner((index - 1 + total) % total); }
    else if (e.key === 'Home' && total) { e.preventDefault(); selectionner(0); }
    else if (e.key === 'End' && total) { e.preventDefault(); selectionner(total - 1); }
    else if (e.key === 'Tab') e.preventDefault();
    else if (e.key === 'Enter') { e.preventDefault(); mode === 'note' ? enregistrerNote() : valider(); }
  }

  async function enregistrerNote() {
    const texte = saisie.value.trim();
    if (!texte) return;
    try {
      await ajouterNote({
        id: genererId(), texte, url: location.href, titre: document.title,
        site: nomDuSite(location.href), date: new Date().toISOString(), type: 'note'
      });
      fermer();
      toast('Note enregistrée.', 'succes');
    } catch (erreur) {
      console.warn('[InstantAction] échec de l’enregistrement de la note', erreur);
      toast('Impossible d’enregistrer la note.', 'erreur');
    }
  }

  function valider() {
    const action = entrees[index];
    if (!action) return;
    if (!estCompatible(action, ctx.types)) {
      toast('Cette action n’est pas disponible ici.', 'info');
      return;
    }
    fermer();
    executer(action, ctx);
  }

  function selectionner(i) {
    index = i;
    [...liste.querySelectorAll('.ia-item')].forEach((li, n) => {
      const actif = n === i;
      li.classList.toggle('actif', actif);
      li.setAttribute('aria-selected', String(actif));
      if (actif) {
        saisie.setAttribute('aria-activedescendant', li.id);
        li.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  async function basculerFavori(id) {
    const reglages = obtenirReglages();
    const favoris = reglages.favoris.includes(id) ? reglages.favoris.filter((f) => f !== id) : [...reglages.favoris, id];
    await sauverReglages({ favoris }); // le changement de réglages remet le registre à jour
    setTimeout(rafraichir, 30);
  }

  function rafraichir() {
    liste.textContent = '';
    entrees = [];
    if (mode === 'note') {
      liste.appendChild(el('li', 'ia-vide', 'La note sera liée à cette page (adresse, titre, date).'));
      return;
    }
    const reglages = obtenirReglages();
    const registre = obtenirRegistre();
    const compatibles = getActionsForContext(ctx, registre, reglages);
    const requete = normaliser(saisie.value).trim();
    let sections;
    if (!requete) {
      const parId = new Map(compatibles.map((a) => [a.id, a]));
      const dejaVus = new Set();
      const prendre = (liste_) => liste_.filter((a) => a && !dejaVus.has(a.id) && dejaVus.add(a.id));
      const rec = prendre(recents.slice(0, 3).map((id) => parId.get(id)));
      const fav = prendre(compatibles.filter((a) => reglages.favoris.includes(a.id)));
      const autres = prendre(compatibles);
      sections = [['Récents', rec], ['Favoris', fav], ['Actions disponibles', autres]];
    } else {
      const base = mode === 'contexte' ? compatibles : registre.filter((a) => !a.etape && estActive(a, reglages));
      const trouvees = base
        .map((a) => ({ a, s: score(a, requete) + (reglages.favoris.includes(a.id) ? 10 : 0) }))
        .filter((x) => x.s > 0)
        .sort((x, y) => y.s - x.s || Number(estCompatible(y.a, ctx.types)) - Number(estCompatible(x.a, ctx.types)))
        .map((x) => x.a);
      sections = [[null, trouvees]];
    }
    for (const [titre, actions] of sections) {
      if (!actions.length) continue;
      if (titre) { const t = el('li', 'ia-section', titre); t.setAttribute('role', 'presentation'); liste.appendChild(t); }
      for (const action of actions) {
        const n = entrees.length;
        entrees.push(action);
        const compat = estCompatible(action, ctx.types);
        const li = el('li', `ia-item${compat ? '' : ' indispo'}`);
        li.id = `ia-opt-${n}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        if (!compat) li.setAttribute('aria-disabled', 'true');
        const texte = el('div', 'ia-txt');
        texte.append(el('span', 'ia-nom', action.name), el('span', 'ia-desc', compat ? action.description : 'Indisponible ici'));
        const etoile = el('button', 'ia-etoile', reglages.favoris.includes(action.id) ? '★' : '☆');
        etoile.type = 'button';
        etoile.tabIndex = -1;
        etoile.setAttribute('aria-label', 'Basculer le favori');
        etoile.addEventListener('mousedown', (e) => e.preventDefault());
        etoile.addEventListener('click', (e) => { e.stopPropagation(); basculerFavori(action.id); });
        li.append(el('span', 'ia-ico', action.icon), texte);
        if (action.shortcut) li.appendChild(el('kbd', 'ia-raccourci', action.shortcut));
        li.appendChild(etoile);
        li.addEventListener('mousemove', () => { if (index !== n) selectionner(n); });
        li.addEventListener('click', () => { index = n; valider(); });
        liste.appendChild(li);
      }
    }
    if (!entrees.length) liste.appendChild(el('li', 'ia-vide', 'Aucune action trouvée.'));
    else selectionner(Math.min(index, entrees.length - 1));
  }

  return { ouvrir, fermer, estOuverte: () => ouverte };
}
