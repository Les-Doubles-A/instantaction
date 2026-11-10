// Service worker : menus contextuels, raccourcis Chrome et actions nécessitant les API du navigateur.
import { lireReglages, surChangementReglages } from '../shared/storage.js';
import { construireRegistre, estActive } from '../shared/commands.js';
import { TYPES_MESSAGE } from '../shared/constants.js';

// Structure du menu contextuel : contexte Chrome → identifiants d'actions.
const MENUS = [
  { contexte: 'selection', actions: ['copy-clean', 'save-note', 'search'] },
  { contexte: 'link', actions: ['open-link', 'copy-link-url', 'save-link'] },
  { contexte: 'image', actions: ['copy-image', 'download-image', 'copy-image-url'] },
  { contexte: 'editable', actions: ['paste-plain', 'clean-field', 'count-chars'] },
  { contexte: 'video', actions: ['copy-video-url', 'open-video'] },
  { contexte: 'page', actions: ['copy-page-url', 'save-page', 'open-notes'] }
];
const TOUS_CONTEXTES = MENUS.map((m) => m.contexte);

let fileMenus = Promise.resolve();

function reconstruireMenus() {
  // Les reconstructions sont chaînées pour éviter les identifiants en double.
  fileMenus = fileMenus.then(async () => {
    const reglages = await lireReglages();
    const registre = construireRegistre(reglages);
    await new Promise((resolve) => chrome.contextMenus.removeAll(resolve));
    if (!reglages.actif) return;
    const creer = (proprietes) =>
      chrome.contextMenus.create(proprietes, () => {
        if (chrome.runtime.lastError) console.debug('[InstantAction] menu non créé :', chrome.runtime.lastError.message);
      });
    creer({ id: 'ia-racine', title: 'InstantAction', contexts: TOUS_CONTEXTES });
    for (const { contexte, actions } of MENUS) {
      for (const id of actions) {
        const action = registre.find((a) => a.id === id);
        if (!action || !estActive(action, reglages)) continue;
        creer({ id: `ia|${contexte}|${id}`, parentId: 'ia-racine', title: `${action.icon} ${action.name}`, contexts: [contexte] });
      }
    }
    creer({ id: 'ia|plus|palette', parentId: 'ia-racine', title: 'Plus…', contexts: TOUS_CONTEXTES });
  }).catch((erreur) => console.warn('[InstantAction] reconstruction des menus impossible', erreur));
}

chrome.runtime.onInstalled.addListener(reconstruireMenus);
chrome.runtime.onStartup.addListener(reconstruireMenus);
surChangementReglages(reconstruireMenus);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  const [, contexte, idAction] = String(info.menuItemId).split('|');
  const message =
    contexte === 'plus'
      ? { type: TYPES_MESSAGE.OUVRIR_PALETTE, cadreCible: true }
      : {
          type: TYPES_MESSAGE.EXECUTER_ACTION,
          cadreCible: true,
          idAction,
          infos: { selectionText: info.selectionText, linkUrl: info.linkUrl, srcUrl: info.srcUrl, mediaType: info.mediaType }
        };
  chrome.tabs.sendMessage(tab.id, message, { frameId: info.frameId ?? 0 }).catch(() => {});
});

// Raccourcis gérés par Chrome (voir "commands" dans le manifest).
const COMMANDES = {
  'ouvrir-palette': { type: TYPES_MESSAGE.OUVRIR_PALETTE },
  'copier-propre': { type: TYPES_MESSAGE.EXECUTER_ACTION, idAction: 'copy-clean' },
  'note-rapide': { type: TYPES_MESSAGE.OUVRIR_PALETTE, mode: 'note' },
  'ouvrir-actions': { type: TYPES_MESSAGE.OUVRIR_ACTIONS }
};

chrome.commands.onCommand.addListener(async (commande, tab) => {
  const message = COMMANDES[commande];
  if (!message) return;
  const cible = tab ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (cible?.id) chrome.tabs.sendMessage(cible.id, message).catch(() => {}); // page non injectable (chrome://, store…)
});

// Messages envoyés par les scripts de contenu et les pages de l'extension.
const urlWebValide = (url) => /^https?:\/\//i.test(url || '');

chrome.runtime.onMessage.addListener((message, expediteur, repondre) => {
  const echec = (texte) => repondre({ ok: false, message: texte });
  switch (message?.type) {
    case TYPES_MESSAGE.OUVRIR_URL:
      if (!urlWebValide(message.url)) return echec('Ce lien ne peut pas être ouvert.');
      chrome.tabs.create({ url: message.url, active: true, openerTabId: expediteur.tab?.id }, () => repondre({ ok: true }));
      return true;
    case TYPES_MESSAGE.TELECHARGER:
      if (!/^(https?:|data:image\/)/i.test(message.url || '')) return echec('Impossible de télécharger cette image.');
      chrome.downloads.download({ url: message.url }, () =>
        chrome.runtime.lastError ? echec('Impossible de télécharger cette image.') : repondre({ ok: true })
      );
      return true;
    case TYPES_MESSAGE.APERCU:
      if (!urlWebValide(message.url)) return echec("Ce lien ne peut pas être prévisualisé.");
      chrome.windows.create({ url: message.url, type: 'popup', width: 960, height: 680 }, () => repondre({ ok: true }));
      return true;
    case TYPES_MESSAGE.OUVRIR_NOTES:
      chrome.tabs.create({ url: chrome.runtime.getURL('notes/notes.html') }, () => repondre({ ok: true }));
      return true;
    case TYPES_MESSAGE.OUVRIR_OPTIONS:
      chrome.tabs.create({ url: chrome.runtime.getURL(`options/options.html#${message.section || ''}`) }, () => repondre({ ok: true }));
      return true;
    default:
      return false;
  }
});
