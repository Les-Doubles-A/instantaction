// Accès au stockage local (chrome.storage.local). Rien ne quitte le navigateur.
import { CLES, REGLAGES_DEFAUT, MAX_NOTES, MAX_HISTORIQUE } from './constants.js';

async function lire(cle, defaut) {
  const resultat = await chrome.storage.local.get(cle);
  return resultat[cle] ?? defaut;
}

export function fusionnerReglages(brut) {
  return { ...structuredClone(REGLAGES_DEFAUT), ...(brut || {}) };
}

export async function lireReglages() {
  return fusionnerReglages(await lire(CLES.reglages, {}));
}

export async function sauverReglages(partiel) {
  const nouveaux = { ...(await lireReglages()), ...partiel };
  await chrome.storage.local.set({ [CLES.reglages]: nouveaux });
  return nouveaux;
}

export function surChangementReglages(rappel) {
  chrome.storage.onChanged.addListener((changements, zone) => {
    if (zone === 'local' && changements[CLES.reglages]) {
      rappel(fusionnerReglages(changements[CLES.reglages].newValue));
    }
  });
}

// --- Notes ---
export const lireNotes = () => lire(CLES.notes, []);

export async function ajouterNote(note) {
  const notes = await lireNotes();
  notes.unshift(note);
  await chrome.storage.local.set({ [CLES.notes]: notes.slice(0, MAX_NOTES) });
}

export async function supprimerNote(id) {
  const notes = (await lireNotes()).filter((n) => n.id !== id);
  await chrome.storage.local.set({ [CLES.notes]: notes });
}

export const viderNotes = () => chrome.storage.local.set({ [CLES.notes]: [] });

// --- Historique des actions ---
export const lireHistorique = () => lire(CLES.historique, []);

export async function ajouterHistorique(idAction) {
  const reglages = await lireReglages();
  if (!reglages.historiqueActif) return;
  const historique = await lireHistorique();
  historique.push({ id: idAction, date: Date.now() });
  await chrome.storage.local.set({ [CLES.historique]: historique.slice(-MAX_HISTORIQUE) });
}

export const viderHistorique = () => chrome.storage.local.set({ [CLES.historique]: [] });

export const toutEffacer = () => chrome.storage.local.clear();
