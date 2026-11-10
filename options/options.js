import { lireReglages, sauverReglages, viderNotes, viderHistorique, toutEffacer, lireNotes } from '../shared/storage.js';
import { construireRegistre, trierActions } from '../shared/commands.js';
import { COMMANDES_CHROME, REGLAGES_DEFAUT } from '../shared/constants.js';
import { LIBELLES_CONTEXTES } from '../shared/types.js';
import { h, appliquerThemePage, combinaisonClavier, genererId } from '../shared/utils.js';

const SECTIONS = [
  ['general', 'Général'],
  ['actions', 'Actions'],
  ['perso', 'Personnalisé'],
  ['raccourcis', 'Raccourcis'],
  ['apparence', 'Apparence'],
  ['confidentialite', 'Confidentialité']
];
// Actions utilisables comme étapes de workflow (elles travaillent sur du texte).
const ETAPES_WORKFLOW = ['clean-text', 'upper', 'lower', 'title', 'summarize', 'copy-text', 'save-note', 'search', 'translate', 'define', 'open-notes'];

let reglages;
let section = location.hash.slice(1) || 'general';
const contenu = document.getElementById('contenu');

async function maj(partiel) {
  reglages = await sauverReglages(partiel);
  appliquerThemePage(reglages);
  rendre();
}

const registreAffichable = () => construireRegistre(reglages).filter((a) => !a.etape);
const nomAction = (id) => construireRegistre(reglages).find((a) => a.id === id)?.name ?? id;

function interrupteur(titre, cle, aide) {
  return h('label', { class: 'ligne' },
    h('div', { class: 'texte' }, h('div', { class: 'titre' }, titre), aide && h('div', { class: 'discret' }, aide)),
    h('input', { type: 'checkbox', checked: reglages[cle], onchange: (e) => maj({ [cle]: e.target.checked }) })
  );
}

function champTexte(titre, cle, aide) {
  return h('label', { class: 'ligne' },
    h('div', { class: 'texte' }, h('div', { class: 'titre' }, titre), aide && h('div', { class: 'discret' }, aide)),
    h('input', { type: 'text', value: reglages[cle], style: 'width:300px', onchange: (e) => maj({ [cle]: e.target.value.trim() || REGLAGES_DEFAUT[cle] }) })
  );
}

/** Champ de capture de raccourci : l'utilisateur appuie sur la combinaison voulue. */
function champRaccourci(valeurInitiale = '') {
  const champ = h('input', { type: 'text', readonly: true, value: valeurInitiale, placeholder: 'Appuyez sur une combinaison…', 'aria-label': 'Raccourci clavier' });
  champ.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') return;
    e.preventDefault();
    if (e.key === 'Backspace' || e.key === 'Delete') { champ.value = ''; return; }
    const combo = combinaisonClavier(e);
    if (combo && /^(Ctrl|Alt|Meta)/.test(combo)) champ.value = combo; // un modificateur est obligatoire
  });
  return champ;
}

// ---------- Sections ----------

function sectionGeneral() {
  return [
    h('h2', {}, 'Général'),
    h('div', { class: 'carte' },
      interrupteur('Activer InstantAction', 'actif', 'Désactive toutes les fonctions sur toutes les pages.'),
      interrupteur('Afficher la barre de sélection', 'afficherBarre', 'Petite barre d’actions près du texte sélectionné.'),
      interrupteur('Activer la palette de commandes', 'paletteActive'),
      interrupteur('Animations', 'animations'),
      champTexte('Moteur de recherche', 'moteurRecherche', 'Utilisez {selection} pour le texte recherché.'),
      champTexte('Langue de traduction', 'langueCible', 'Code de langue, par ex. fr, en, es.')
    )
  ];
}

function sectionActions() {
  const toutes = trierActions(registreAffichable(), reglages, false);
  const ids = toutes.map((a) => a.id);
  const deplacer = (i, delta) => {
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    maj({ ordre: ids });
  };
  const basculer = (liste, id) => (liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id]);
  return [
    h('h2', {}, 'Actions'),
    h('p', { class: 'discret' }, 'Activez, épinglez (★) et réordonnez vos actions. Les favoris apparaissent en priorité.'),
    h('div', { class: 'carte' },
      toutes.map((action, i) =>
        h('div', { class: 'ligne' },
          h('input', { type: 'checkbox', checked: !reglages.actionsDesactivees.includes(action.id), 'aria-label': `Activer ${action.name}`,
            onchange: () => maj({ actionsDesactivees: basculer(reglages.actionsDesactivees, action.id) }) }),
          h('button', { class: `etoile${reglages.favoris.includes(action.id) ? ' on' : ''}`, title: 'Favori', 'aria-label': `Favori : ${action.name}`,
            onclick: () => maj({ favoris: basculer(reglages.favoris, action.id) }) }, reglages.favoris.includes(action.id) ? '★' : '☆'),
          h('div', { class: 'texte' },
            h('div', { class: 'titre' }, `${action.icon} ${action.name}`),
            h('div', { class: 'discret' }, `${action.description} — ${action.contexts.map((c) => LIBELLES_CONTEXTES[c]).join(', ')}`)),
          h('button', { 'aria-label': 'Monter', onclick: () => deplacer(i, -1) }, '↑'),
          h('button', { 'aria-label': 'Descendre', onclick: () => deplacer(i, 1) }, '↓')
        ))
    )
  ];
}

function sectionPerso() {
  // --- Action personnalisée ---
  const message = h('p', { class: 'alerte', role: 'alert' });
  const nom = h('input', { type: 'text', placeholder: 'Google' });
  const modele = h('input', { type: 'text', value: 'https://www.google.com/search?q={selection}' });
  const raccourci = champRaccourci();
  const contextes = ['TEXT_SELECTION', 'LINK', 'IMAGE', 'PAGE'].map((c) => ({ c, boite: h('input', { type: 'checkbox', checked: c === 'TEXT_SELECTION' }) }));
  const ajouter = () => {
    if (!nom.value.trim()) { message.textContent = 'Donnez un nom à l’action.'; return; }
    if (!/^https?:\/\//i.test(modele.value.trim())) { message.textContent = 'L’adresse doit commencer par http:// ou https://'; return; }
    const choisis = contextes.filter((x) => x.boite.checked).map((x) => x.c);
    if (!choisis.length) { message.textContent = 'Choisissez au moins un contexte.'; return; }
    maj({ actionsPerso: [...reglages.actionsPerso, { id: genererId(), nom: nom.value.trim(), modele: modele.value.trim(), contextes: choisis, raccourci: raccourci.value, icone: '🔗' }] });
  };

  // --- Workflow ---
  const messageFlux = h('p', { class: 'alerte', role: 'alert' });
  const nomFlux = h('input', { type: 'text', placeholder: 'Nettoyer et copier' });
  const raccourciFlux = champRaccourci();
  let etapes = [];
  const puces = h('div', { class: 'puces' });
  const dessinerPuces = () => {
    puces.textContent = '';
    if (!etapes.length) puces.append(h('span', { class: 'discret' }, 'Sélection → (ajoutez des étapes)'));
    etapes.forEach((id, i) => puces.append(h('span', { class: 'puce' }, `${i + 1}. ${nomAction(id)}`,
      h('button', { 'aria-label': 'Retirer', onclick: () => { etapes.splice(i, 1); dessinerPuces(); } }, '✕'))));
  };
  dessinerPuces();
  const choixEtape = h('select', { 'aria-label': 'Étape à ajouter' }, ETAPES_WORKFLOW.map((id) => h('option', { value: id }, nomAction(id))));
  const creerFlux = () => {
    if (!nomFlux.value.trim() || !etapes.length) { messageFlux.textContent = 'Donnez un nom et au moins une étape.'; return; }
    maj({ workflows: [...reglages.workflows, { id: genererId(), nom: nomFlux.value.trim(), etapes: [...etapes], raccourci: raccourciFlux.value }] });
  };

  const supprimer = (cle, id) => maj({ [cle]: reglages[cle].filter((x) => x.id !== id) });
  return [
    h('h2', {}, 'Personnalisé'),
    h('h3', {}, 'Actions personnalisées'),
    h('p', { class: 'discret' }, 'Ouvrez une adresse avec des variables : {selection}, {url}, {title}.'),
    h('div', { class: 'carte' },
      reglages.actionsPerso.map((p) => h('div', { class: 'ligne' },
        h('div', { class: 'texte' }, h('div', { class: 'titre' }, `🔗 ${p.nom}`), h('div', { class: 'discret' }, `${p.modele}${p.raccourci ? ' — ' + p.raccourci : ''}`)),
        h('button', { class: 'danger', onclick: () => supprimer('actionsPerso', p.id) }, 'Supprimer'))),
      h('div', { class: 'formulaire' },
        h('label', {}, 'Nom', nom), h('label', {}, 'Adresse (modèle)', modele),
        h('label', {}, 'Déclencheur (raccourci dans la page, ex. Alt+G)', raccourci),
        h('div', { class: 'coches' }, contextes.map((x) => h('label', {}, x.boite, LIBELLES_CONTEXTES[x.c]))),
        h('div', {}, h('button', { class: 'primaire', onclick: ajouter }, 'Ajouter l’action')), message)
    ),
    h('h3', {}, 'Workflows (automatisations)'),
    h('p', { class: 'discret' }, 'Enchaînez des étapes sur la sélection, sans code : par ex. Sélection → nettoyer → copier.'),
    h('div', { class: 'carte' },
      reglages.workflows.map((f) => h('div', { class: 'ligne' },
        h('div', { class: 'texte' }, h('div', { class: 'titre' }, `⚡ ${f.nom}`), h('div', { class: 'discret' }, 'Sélection → ' + f.etapes.map(nomAction).join(' → '))),
        h('button', { class: 'danger', onclick: () => supprimer('workflows', f.id) }, 'Supprimer'))),
      h('div', { class: 'formulaire' },
        h('label', {}, 'Nom du workflow', nomFlux),
        h('div', {}, puces),
        h('div', { class: 'ligne' }, choixEtape, h('button', { onclick: () => { etapes.push(choixEtape.value); dessinerPuces(); } }, 'Ajouter l’étape')),
        h('label', {}, 'Raccourci (optionnel)', raccourciFlux),
        h('div', {}, h('button', { class: 'primaire', onclick: creerFlux }, 'Créer le workflow')), messageFlux)
    )
  ];
}

function sectionRaccourcis() {
  const actions = registreAffichable();
  const choixAction = h('select', { 'aria-label': 'Action' }, actions.map((a) => h('option', { value: a.id }, a.name)));
  const champ = champRaccourci();
  const message = h('p', { class: 'alerte', role: 'alert' });
  const retirer = (id) => { const copie = { ...reglages.raccourcisPage }; delete copie[id]; maj({ raccourcisPage: copie }); };
  return [
    h('h2', {}, 'Raccourcis'),
    h('h3', {}, 'Raccourcis gérés par Chrome'),
    h('p', { class: 'discret' }, 'Chrome gère lui-même ces raccourcis globaux : ils se modifient dans chrome://extensions/shortcuts et peuvent être en conflit avec le système (par ex. Alt+Space sous Windows).'),
    h('div', { class: 'carte' },
      COMMANDES_CHROME.map((c) => h('div', { class: 'ligne' }, h('div', { class: 'texte' }, c.libelle), h('kbd', {}, c.defaut))),
      h('div', { class: 'ligne' }, h('div', { class: 'texte discret' }, 'Chrome limite à 4 raccourcis suggérés par extension.'),
        h('button', { class: 'primaire', onclick: () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }) }, 'Modifier dans Chrome'))
    ),
    h('h3', {}, 'Raccourcis dans la page (configurables)'),
    h('p', { class: 'discret' }, 'Associez une combinaison (avec Alt, Ctrl ou Meta) à n’importe quelle action.'),
    h('div', { class: 'carte' },
      Object.entries(reglages.raccourcisPage).filter(([, combo]) => combo).map(([id, combo]) =>
        h('div', { class: 'ligne' }, h('div', { class: 'texte' }, nomAction(id)), h('kbd', {}, combo), h('button', { class: 'danger', onclick: () => retirer(id) }, 'Retirer'))),
      h('div', { class: 'formulaire' },
        h('label', {}, 'Action', choixAction), h('label', {}, 'Combinaison', champ),
        h('div', {}, h('button', { class: 'primaire', onclick: () => {
          if (!champ.value) { message.textContent = 'Appuyez d’abord sur une combinaison.'; return; }
          maj({ raccourcisPage: { ...reglages.raccourcisPage, [choixAction.value]: champ.value } });
        } }, 'Associer')), message)
    )
  ];
}

function sectionApparence() {
  const liste = (titre, cle, options) => h('label', { class: 'ligne' },
    h('div', { class: 'texte titre' }, titre),
    h('select', { onchange: (e) => maj({ [cle]: e.target.value }) }, options.map(([v, l]) => h('option', { value: v, selected: reglages[cle] === v }, l))));
  return [
    h('h2', {}, 'Apparence'),
    h('div', { class: 'carte' },
      liste('Thème', 'theme', [['sombre', 'Sombre'], ['clair', 'Clair'], ['auto', 'Automatique']]),
      liste('Densité', 'densite', [['normale', 'Normale'], ['compacte', 'Compacte']]))
  ];
}

function sectionConfidentialite() {
  const message = h('p', { class: 'discret', role: 'status' });
  const executer = async (fn, texte) => { await fn(); message.textContent = texte; };
  return [
    h('h2', {}, 'Confidentialité'),
    h('p', { class: 'discret' }, 'Toutes les données (notes, historique, réglages) restent dans le stockage local de ce navigateur. Aucun serveur n’est utilisé. Seules « Traduire » et « Rechercher » ouvrent un site web, à votre demande.'),
    h('div', { class: 'carte' }, interrupteur('Mémoriser l’historique des actions', 'historiqueActif', 'Alimente la liste « Récents » de la palette.')),
    h('div', { class: 'rangee-boutons' },
      h('button', { onclick: () => executer(viderHistorique, 'Historique effacé.') }, 'Effacer l’historique'),
      h('button', { onclick: () => executer(viderNotes, 'Notes effacées.') }, 'Effacer les notes'),
      h('button', { onclick: async () => {
        const donnees = JSON.stringify({ reglages, notes: await lireNotes() }, null, 2);
        const lien = h('a', { href: URL.createObjectURL(new Blob([donnees], { type: 'application/json' })), download: 'instantaction-donnees.json' });
        lien.click();
        setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
      } }, 'Exporter mes données'),
      h('button', { class: 'danger', onclick: async () => {
        if (!confirm('Effacer toutes les données d’InstantAction (réglages, notes, historique) ?')) return;
        await toutEffacer();
        reglages = await lireReglages();
        rendre();
      } }, 'Tout effacer')
    ),
    message
  ];
}

const RENDUS = { general: sectionGeneral, actions: sectionActions, perso: sectionPerso, raccourcis: sectionRaccourcis, apparence: sectionApparence, confidentialite: sectionConfidentialite };

function rendre() {
  if (!RENDUS[section]) section = 'general';
  const nav = document.getElementById('navigation');
  nav.textContent = '';
  SECTIONS.forEach(([id, libelle]) => nav.append(h('a', { href: `#${id}`, 'aria-current': id === section ? 'page' : null }, libelle)));
  contenu.textContent = '';
  contenu.append(...RENDUS[section]());
}

window.addEventListener('hashchange', () => { section = location.hash.slice(1) || 'general'; rendre(); });

(async function demarrer() {
  reglages = await lireReglages();
  appliquerThemePage(reglages);
  rendre();
})();
