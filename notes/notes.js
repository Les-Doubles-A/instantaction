import { lireReglages, lireNotes, supprimerNote, viderNotes } from '../shared/storage.js';
import { CLES } from '../shared/constants.js';
import { h, appliquerThemePage, normaliser, copierTexte } from '../shared/utils.js';

const liste = document.getElementById('liste');
const recherche = document.getElementById('recherche');
const compteur = document.getElementById('compteur');
let notes = [];

const formaterDate = (iso) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

function lienSur(note) {
  if (!/^https?:\/\//i.test(note.url || '')) return null;
  return h('a', { href: note.url, target: '_blank', rel: 'noopener noreferrer' }, note.titre || note.site || note.url);
}

function afficher() {
  const requete = normaliser(recherche.value).trim();
  const filtrees = notes.filter((n) => !requete || normaliser([n.texte, n.titre, n.site, n.url].join(' ')).includes(requete));
  compteur.textContent = `${filtrees.length} note${filtrees.length > 1 ? 's' : ''}`;
  liste.textContent = '';
  if (!filtrees.length) {
    liste.append(h('p', { class: 'vide' }, notes.length ? 'Aucun résultat.' : 'Aucune note pour le moment. Sélectionnez du texte puis utilisez « Ajouter aux notes ».'));
    return;
  }
  for (const note of filtrees) {
    const boutonCopier = h('button', { onclick: async () => {
      try { await copierTexte(note.texte); boutonCopier.textContent = 'Copié ✓'; } catch { boutonCopier.textContent = 'Échec'; }
    } }, 'Copier');
    liste.append(
      h('article', { class: 'note' },
        h('p', { class: 'note-texte' }, note.texte),
        h('div', { class: 'note-meta' },
          h('span', { class: 'type' }, note.type || 'note'),
          lienSur(note),
          h('span', {}, formaterDate(note.date)),
          h('span', { class: 'espace' }),
          boutonCopier,
          h('button', { class: 'danger', onclick: () => supprimerNote(note.id) }, 'Supprimer')
        )
      )
    );
  }
}

async function charger() {
  notes = await lireNotes();
  afficher();
}

async function demarrer() {
  appliquerThemePage(await lireReglages());
  recherche.addEventListener('input', afficher);
  document.getElementById('tout-supprimer').addEventListener('click', async () => {
    if (notes.length && confirm('Supprimer toutes les notes ? Cette action est définitive.')) await viderNotes();
  });
  document.getElementById('exporter').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
    const lien = h('a', { href: URL.createObjectURL(blob), download: 'instantaction-notes.json' });
    lien.click();
    setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
  });
  chrome.storage.onChanged.addListener((changements, zone) => {
    if (zone === 'local' && changements[CLES.notes]) charger();
  });
  await charger();
}

demarrer();
