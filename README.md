# ⚡ InstantAction

Dépôt GitHub : **https://github.com/Les-Doubles-A/instantaction**

Extension Chrome (Manifest V3) qui ajoute une couche d'**actions rapides contextuelles** à n'importe quelle page :
palette de commandes, barre d'actions près de la sélection, menu contextuel, raccourcis, notes locales,
actions personnalisées et workflows.

100 % local : aucune donnée n'est envoyée à un serveur. Aucune dépendance, aucune étape de build (JavaScript ES modules).

## Installation

1. Ouvrez `chrome://extensions`.
2. Activez le **Mode développeur** (en haut à droite).
3. Cliquez sur **Charger l'extension non empaquetée** et choisissez le dossier **`src/`**.
4. Rechargez les onglets déjà ouverts (les scripts de contenu ne s'injectent que dans les pages chargées après l'installation).

## Utilisation

| Fonction | Comment |
|---|---|
| Palette de commandes | `Alt + Space` — tapez `co`, `trad`, `note`… ; ↑ ↓ Entrée Échap ; ☆ pour épingler |
| Copier proprement | `Alt + C` (ou barre de sélection / clic droit) |
| Sauvegarder la sélection | `Alt + S` |
| Nouvelle note | `Alt + N` (écrire, Entrée) |
| Actions disponibles ici | `Alt + Shift + O` (palette limitée au contexte) |
| Barre de sélection | Sélectionnez du texte : `[Copier] [Rechercher] [Traduire] [+]` |
| Clic droit | Menu **InstantAction** adapté : sélection, lien, image, champ, vidéo, page |
| Notes | Popup → « Mes notes », ou action « Ouvrir mes notes » |

### À propos des raccourcis
- `Alt+Space`, `Alt+C`, `Alt+N`, `Alt+Shift+O` sont des **commandes Chrome** (modifiables dans `chrome://extensions/shortcuts`).
  Chrome limite à **4 raccourcis suggérés** par extension, d'où `Alt+S` géré **dans la page**.
- Les raccourcis « dans la page » (ex. `Alt+S`, ou le `Alt+G` d'une action personnalisée) se configurent dans *Options → Raccourcis*.
- Sous Windows, `Alt+Space` peut ouvrir le menu système de la fenêtre : si Chrome n'a pas pu l'attribuer, un repli dans la page prend le relais ; sinon choisissez une autre combinaison.
- Chrome n'autorise pas l'injection sur `chrome://`, le Chrome Web Store ni le lecteur PDF : les raccourcis n'y fonctionnent pas.

## Contextes détectés

`detectContext()` renvoie `TEXT_SELECTION`, `LINK`, `IMAGE`, `VIDEO`, `INPUT`, `TEXTAREA`, `CODE`, `TABLE`, `PAGE` ou `UNKNOWN`
(`UNKNOWN` = champ mot de passe : aucune action n'y est jamais proposée).
`getActionsForContext(contexte)` ne renvoie que les actions pertinentes, actives, favorites d'abord.
La détection part uniquement de la sélection et de l'élément ciblé : pas de MutationObserver, pas d'analyse de page.

## Architecture

```
src/
  manifest.json
  background/service-worker.js   menus contextuels, commandes Chrome, ouverture d'onglets / téléchargements
  content/
    content.js                   chargeur (script classique → import dynamique du module)
    main.js                      orchestration : messages, raccourcis, exécution des actions
    context-detector.js          construireContexte(), detectContext()
    action-bar.js                barre près de la sélection
    palette.js                   palette de commandes (clavier, ARIA)
    ui.js                        hôte Shadow DOM, toasts, carte de résultat
    styles.css                   styles isolés dans le Shadow DOM
  actions/                       une famille d'actions par fichier + index.js (registre)
  shared/
    types.js constants.js        contextes, réglages par défaut, messages
    storage.js                   chrome.storage.local (réglages, notes, historique)
    commands.js                  registre, getActionsForContext, actions perso & workflows
    utils.js                     nettoyage de texte, copie, remplacement dans un champ…
    theme.css                    thème commun des pages
  popup/  options/  notes/       pages de l'extension
  icons/
```

Flux : le **service worker** (ou un raccourci) envoie un message au **script de contenu** → `main.js` construit le contexte
à partir de la sélection/cible → l'action choisie s'exécute (`execute(ctx, api)`) → toast de succès ou message d'erreur discret.
Les actions s'exécutent dans la page (presse-papiers, champs de saisie) ; seules les API de navigateur (onglets, téléchargements)
passent par le service worker.

L'interface est dans un **Shadow DOM fermé**, avec feuille de style construite (`adoptedStyleSheets`) pour résister aux CSS et aux CSP des sites.
Dans les iframes, seul le cadre actif réagit aux raccourcis globaux.

## Ajouter une nouvelle action

Créez `src/actions/mon-action.js` :

```js
export const actionsExemple = [
  {
    id: 'mon-action',                 // unique
    name: 'Mon action',
    description: 'Ce qu’elle fait',
    icon: '🚀',
    shortcut: undefined,              // indicatif, facultatif
    contexts: ['TEXT_SELECTION'],     // voir shared/types.js
    keywords: ['exemple'],
    // etape: true,                   // réservée aux workflows (masquée des listes)
    async execute(ctx, api) {
      // ctx : texte, champ, lienUrl, imageUrl, videoUrl, code, tableau, pageUrl, titre…
      // api : toast(), afficherResultat(), ouvrirUrl(), telecharger(), reglages…
      api.toast(`Sélection : ${ctx.texte.length} caractères`, 'succes');
      return { texte: ctx.texte };    // facultatif : transmis à l'étape suivante d'un workflow
    }
  }
];
```

puis ajoutez **une ligne** dans `src/actions/index.js` (`...actionsExemple`). Le cœur (palette, barre, menus, options) n'a pas à changer.
Pour une erreur lisible : `throw faireErreur('Message pour l’utilisateur.')` (voir `shared/utils.js`).
Pour l'ajouter au menu clic droit, ajoutez son id dans `MENUS` (`background/service-worker.js`).

## Actions personnalisées et workflows

*Options → Personnalisé*.
- **Action personnalisée** : nom, déclencheur (ex. `Alt+G`), contextes, adresse avec `{selection}`, `{url}`, `{title}`
  (ex. `https://www.google.com/search?q={selection}`).
- **Workflow** : enchaînement d'étapes sans code, ex. *Sélection → nettoyer → copier* ou *Sélection → enregistrer → ouvrir mes notes*.
  Chaque étape transmet son texte à la suivante.

## Confidentialité et permissions

- `storage` : réglages, notes, historique (stockage local uniquement).
- `contextMenus` : menu clic droit.
- `clipboardWrite` : copie fiable depuis n'importe quelle page.
- `downloads` : « Télécharger l'image ».
- Script de contenu sur `<all_urls>` pour fonctionner partout ; aucun accès réseau de l'extension.
- « Traduire », « Rechercher », « Expliquer le code » ouvrent un site web (Google par défaut) **uniquement quand vous les déclenchez** ; le moteur est modifiable.
- « Résumer » est local (résumé extractif), sans envoi.
- *Options → Confidentialité* : désactiver l'historique, effacer historique / notes / tout, exporter ses données.

## Limites connues

- Certaines images protégées (CORS) ne peuvent pas être copiées en tant qu'image : l'adresse est alors copiée à la place.
- « Coller sans formatage » demande à Chrome l'autorisation de lire le presse-papiers (une fois par site).
- Les actions ne s'exécutent pas sur les pages internes de Chrome, le Web Store et les PDF.
- Aucune interface n'est injectée dans les iframes inter-origines qui bloquent l'exécution de scripts d'extension.

## Développement

Aucun build : modifiez les fichiers de `src/`, puis cliquez sur ↻ dans `chrome://extensions`.
Les identifiants, commentaires et messages de journal sont en français.

<!-- installeur-release -->
## Installation

Téléchargez **`instantaction-Setup-1.0.0.exe`** depuis la [dernière release](https://github.com/Les-Doubles-A/instantaction/releases/latest), puis lancez-le.

L'installeur copie l'extension dans `%LOCALAPPDATA%\Programs\instantaction\extension` puis affiche la marche à suivre :

1. Ouvrez la page des extensions du navigateur (`chrome://extensions`, `edge://extensions`, `vivaldi://extensions`...).
2. Activez le **Mode développeur**.
3. Cliquez sur **Charger l'extension non empaquetée** et choisissez le dossier `extension` (raccourci dans le menu Démarrer).

L'installeur n'est pas signé : si Windows SmartScreen l'affiche, cliquez sur « Informations complémentaires » puis « Exécuter quand même ».

### Recréer l'installeur

Lancer [Inno Setup 6](https://jrsoftware.org/isinfo.php) : `iscc installer\instantaction.iss`. Le setup est créé dans `installer\Output\`.
