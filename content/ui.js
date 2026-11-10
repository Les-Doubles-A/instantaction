// Interface isolée dans un Shadow DOM (les CSS du site ne peuvent pas la casser).
import { copierTexte } from '../shared/utils.js';

let hote = null;
let conteneur = null;
let texteCss = null;
let reglagesUi = { theme: 'sombre', densite: 'normale', animations: true };

export function appliquerApparence(reglages) {
  reglagesUi = reglages;
  if (!conteneur) return;
  conteneur.dataset.theme = reglages.theme;
  conteneur.dataset.densite = reglages.densite;
  conteneur.dataset.anim = reglages.animations ? '1' : '0';
}

/** Crée (une seule fois, à la demande) l'hôte Shadow DOM et retourne le conteneur. */
export async function obtenirUi() {
  if (!conteneur) {
    texteCss ??= await (await fetch(chrome.runtime.getURL('content/styles.css'))).text();
    if (!conteneur) {
      hote = document.createElement('instantaction-racine');
      hote.style.cssText =
        'all:initial !important;position:fixed !important;top:0 !important;left:0 !important;width:0 !important;height:0 !important;z-index:2147483647 !important;';
      const racine = hote.attachShadow({ mode: 'closed' });
      const feuille = new CSSStyleSheet();
      feuille.replaceSync(texteCss);
      racine.adoptedStyleSheets = [feuille];
      conteneur = document.createElement('div');
      conteneur.className = 'ia';
      racine.appendChild(conteneur);
      appliquerApparence(reglagesUi);
    }
  }
  if (!hote.isConnected) document.documentElement.appendChild(hote); // le site a pu retirer l'hôte
  return conteneur;
}

/** Vrai si l'événement provient de l'interface InstantAction. */
export const estDansUi = (evenement) => !!hote && evenement.composedPath().includes(hote);

export async function toast(message, type = 'info', duree = 2400) {
  const c = await obtenirUi();
  let zone = c.querySelector('.ia-toasts');
  if (!zone) {
    zone = document.createElement('div');
    zone.className = 'ia-toasts';
    zone.setAttribute('role', 'status');
    zone.setAttribute('aria-live', 'polite');
    c.appendChild(zone);
  }
  const element = document.createElement('div');
  element.className = `ia-toast ia-${type}`;
  element.textContent = message;
  zone.appendChild(element);
  while (zone.children.length > 3) zone.firstChild.remove();
  setTimeout(() => element.remove(), duree);
}

/** Petite carte affichant un résultat (ex. résumé) avec un bouton Copier. */
export async function afficherResultat(titre, texte) {
  const c = await obtenirUi();
  c.querySelector('.ia-carte')?.remove();
  const carte = document.createElement('div');
  carte.className = 'ia-carte';
  carte.setAttribute('role', 'dialog');
  carte.setAttribute('aria-label', titre);
  const entete = document.createElement('div');
  entete.className = 'ia-carte-titre';
  entete.textContent = titre;
  const corps = document.createElement('div');
  corps.className = 'ia-carte-corps';
  corps.textContent = texte;
  const actions = document.createElement('div');
  actions.className = 'ia-carte-actions';
  const bCopier = document.createElement('button');
  bCopier.textContent = 'Copier';
  bCopier.addEventListener('click', async () => {
    try { await copierTexte(texte); bCopier.textContent = 'Copié ✓'; } catch { toast('Impossible de copier cet élément.', 'erreur'); }
  });
  const bFermer = document.createElement('button');
  bFermer.textContent = 'Fermer';
  bFermer.addEventListener('click', () => carte.remove());
  carte.addEventListener('keydown', (e) => { if (e.key === 'Escape') carte.remove(); e.stopPropagation(); });
  actions.append(bCopier, bFermer);
  carte.append(entete, corps, actions);
  c.appendChild(carte);
  bFermer.focus();
}
