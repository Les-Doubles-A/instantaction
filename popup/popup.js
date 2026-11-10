import { lireReglages, sauverReglages } from '../shared/storage.js';
import { construireRegistre, estActive, trierActions } from '../shared/commands.js';
import { TYPES_MESSAGE } from '../shared/constants.js';
import { h, appliquerThemePage } from '../shared/utils.js';

const message = document.getElementById('message');

function afficherMessage(texte) {
  message.textContent = texte;
  message.hidden = false;
}

async function envoyerAOnglet(contenu) {
  const [onglet] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    if (!onglet?.id) throw new Error('aucun onglet');
    await chrome.tabs.sendMessage(onglet.id, contenu);
    window.close();
  } catch (erreur) {
    console.debug('[InstantAction] page non compatible', erreur);
    afficherMessage('InstantAction ne peut pas s’exécuter sur cette page.');
  }
}

async function demarrer() {
  const reglages = await lireReglages();
  appliquerThemePage(reglages);

  const interrupteur = document.getElementById('actif');
  interrupteur.checked = reglages.actif;
  interrupteur.addEventListener('change', () => sauverReglages({ actif: interrupteur.checked }));

  document.getElementById('palette').addEventListener('click', () => envoyerAOnglet({ type: TYPES_MESSAGE.OUVRIR_PALETTE }));
  document.getElementById('notes').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('notes/notes.html') });
    window.close();
  });
  document.querySelectorAll('nav [data-section]').forEach((bouton) =>
    bouton.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL(`options/options.html#${bouton.dataset.section}`) });
      window.close();
    })
  );

  const registre = construireRegistre(reglages);
  const favoris = trierActions(registre.filter((a) => !a.etape && estActive(a, reglages) && reglages.favoris.includes(a.id)), reglages, false);
  const liste = document.getElementById('favoris');
  if (!favoris.length) liste.append(h('li', { class: 'discret' }, 'Aucun favori : ajoutez-en depuis la palette (☆) ou les options.'));
  for (const action of favoris) {
    liste.append(h('li', {}, h('button', { onclick: () => envoyerAOnglet({ type: TYPES_MESSAGE.EXECUTER_ACTION, idAction: action.id }) }, action.icon, ' ', action.name)));
  }
}

demarrer();
