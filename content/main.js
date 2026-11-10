// Point d'entrée du script de contenu : orchestre détection, barre, palette, menu contextuel et raccourcis.
import { lireReglages, surChangementReglages, ajouterHistorique } from '../shared/storage.js';
import { TYPES_MESSAGE } from '../shared/constants.js';
import { construireRegistre, estCompatible, estActive, listerRaccourcisPage } from '../shared/commands.js';
import { combinaisonClavier, faireErreur } from '../shared/utils.js';
import { construireContexte } from './context-detector.js';
import { appliquerApparence, toast, afficherResultat, estDansUi } from './ui.js';
import { creerBarre } from './action-bar.js';
import { creerPalette } from './palette.js';

let reglages;
let registre = [];
let raccourcis = new Map();
let derniereCible = null;
let palette;
let barre;

async function envoyer(message) {
  try {
    const reponse = await chrome.runtime.sendMessage(message);
    if (reponse && reponse.ok === false) throw faireErreur(reponse.message || "Impossible d'effectuer cette action.");
    return reponse;
  } catch (erreur) {
    if (erreur.convivial) throw erreur;
    throw faireErreur("Impossible d'effectuer cette action."); // ex. extension rechargée
  }
}

// API passée à chaque action.
const api = {
  toast,
  afficherResultat,
  get reglages() { return reglages; },
  get registre() { return registre; },
  ouvrirUrl: (url) => envoyer({ type: TYPES_MESSAGE.OUVRIR_URL, url }),
  telecharger: (url) => envoyer({ type: TYPES_MESSAGE.TELECHARGER, url }),
  apercu: (url) => envoyer({ type: TYPES_MESSAGE.APERCU, url }),
  ouvrirNotes: () => envoyer({ type: TYPES_MESSAGE.OUVRIR_NOTES }),
  ouvrirModeNote: () => palette.ouvrir({ mode: 'note' })
};

async function executerAction(action, ctx) {
  if (!action) return;
  try {
    const resultat = await action.execute(ctx, api);
    ajouterHistorique(action.id).catch(() => {});
    return resultat;
  } catch (erreur) {
    console.warn(`[InstantAction] échec de l'action « ${action.id} »`, erreur);
    toast(erreur?.convivial ?? "Impossible d'effectuer cette action.", 'erreur');
  }
}

const cibleCourante = () => (derniereCible?.isConnected ? derniereCible : document.activeElement);

async function executerParId(idAction, surcharges = {}) {
  const action = registre.find((a) => a.id === idAction);
  if (!action) return;
  if (!estActive(action, reglages)) { toast('Cette action est désactivée dans les paramètres.', 'info'); return; }
  const ctx = construireContexte(cibleCourante(), surcharges);
  if (!estCompatible(action, ctx.types)) {
    const texteSeul = action.contexts.length === 1 && action.contexts[0] === 'TEXT_SELECTION';
    toast(texteSeul ? "Sélectionnez d'abord du texte." : "Cette action n'est pas disponible ici.", 'info');
    return;
  }
  await executerAction(action, ctx);
}

/** Dans une page avec des iframes, seul le cadre actif répond aux raccourcis globaux. */
function estCadreActif() {
  const actifEstCadre = ['IFRAME', 'FRAME'].includes(document.activeElement?.tagName);
  if (document.hasFocus()) return !actifEstCadre;
  return window === window.top;
}

function recalculer(nouveaux) {
  reglages = nouveaux;
  registre = construireRegistre(reglages);
  raccourcis = listerRaccourcisPage(reglages, registre);
  appliquerApparence(reglages);
}

function surClavier(e) {
  if (!reglages?.actif || e.repeat || estDansUi(e)) return;
  const combo = combinaisonClavier(e);
  if (!combo) return;
  if (combo === 'Alt+Space' && reglages.paletteActive) { // repli si Chrome n'a pas pris le raccourci
    e.preventDefault();
    e.stopPropagation();
    palette.ouvrir({ mode: 'actions' });
    return;
  }
  const idAction = raccourcis.get(combo);
  if (idAction) {
    e.preventDefault();
    e.stopPropagation();
    executerParId(idAction);
  }
}

async function demarrer() {
  recalculer(await lireReglages());
  palette = creerPalette({
    obtenirReglages: () => reglages,
    obtenirRegistre: () => registre,
    obtenirCible: cibleCourante,
    executer: executerAction,
    surOuverture: () => barre?.masquer()
  });
  barre = creerBarre({
    obtenirReglages: () => reglages,
    obtenirRegistre: () => registre,
    executer: executerAction,
    ouvrirPalette: () => palette.ouvrir({ mode: 'actions' })
  });

  // Écouteurs légers et permanents (aucun MutationObserver).
  document.addEventListener('contextmenu', (e) => { derniereCible = e.target; }, true);
  document.addEventListener('mouseup', (e) => {
    if (estDansUi(e)) return;
    derniereCible = e.target;
    if (e.button === 0) barre.evaluer(e);
  }, true);
  document.addEventListener('keyup', (e) => {
    if (e.shiftKey || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a')) barre.evaluer(e);
  }, true);
  window.addEventListener('keydown', surClavier, true);
  surChangementReglages(recalculer);

  chrome.runtime.onMessage.addListener((message) => {
    if (!reglages?.actif) return;
    const cadreCible = message.cadreCible === true; // message du menu contextuel : déjà ciblé sur ce cadre
    if (!cadreCible && !estCadreActif()) return;
    switch (message.type) {
      case TYPES_MESSAGE.OUVRIR_PALETTE:
        if (reglages.paletteActive) palette.ouvrir({ mode: message.mode || 'actions' });
        break;
      case TYPES_MESSAGE.OUVRIR_ACTIONS:
        if (reglages.paletteActive) palette.ouvrir({ mode: 'contexte' });
        break;
      case TYPES_MESSAGE.EXECUTER_ACTION:
        executerParId(message.idAction, message.infos || {});
        break;
    }
  });
}

demarrer().catch((erreur) => console.debug('[InstantAction] démarrage impossible', erreur));
