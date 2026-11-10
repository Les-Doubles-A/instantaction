// Constantes partagées.

export const CLES = Object.freeze({
  reglages: 'ia_reglages',
  notes: 'ia_notes',
  historique: 'ia_historique'
});

export const MAX_NOTES = 2000;
export const MAX_HISTORIQUE = 40;

export const TYPES_MESSAGE = Object.freeze({
  OUVRIR_PALETTE: 'IA_OUVRIR_PALETTE',
  OUVRIR_ACTIONS: 'IA_OUVRIR_ACTIONS',
  EXECUTER_ACTION: 'IA_EXECUTER_ACTION',
  OUVRIR_URL: 'IA_OUVRIR_URL',
  TELECHARGER: 'IA_TELECHARGER',
  APERCU: 'IA_APERCU',
  OUVRIR_NOTES: 'IA_OUVRIR_NOTES',
  OUVRIR_OPTIONS: 'IA_OUVRIR_OPTIONS'
});

/** Raccourcis gérés par Chrome (modifiables dans chrome://extensions/shortcuts). */
export const COMMANDES_CHROME = [
  { id: 'ouvrir-palette', libelle: 'Ouvrir la palette de commandes', defaut: 'Alt+Space' },
  { id: 'copier-propre', libelle: 'Copier proprement', defaut: 'Alt+C' },
  { id: 'note-rapide', libelle: 'Ajouter une note', defaut: 'Alt+N' },
  { id: 'ouvrir-actions', libelle: 'Ouvrir les actions disponibles', defaut: 'Alt+Shift+O' }
];

export const REGLAGES_DEFAUT = Object.freeze({
  actif: true,
  afficherBarre: true,
  paletteActive: true,
  animations: true,
  theme: 'sombre', // 'sombre' | 'clair' | 'auto'
  densite: 'normale', // 'normale' | 'compacte'
  historiqueActif: true,
  actionsDesactivees: [],
  ordre: [],
  favoris: ['copy-clean', 'save-note', 'search', 'translate'],
  actionsPerso: [],
  workflows: [],
  // Raccourcis gérés dans la page (configurables) : { idAction: 'Alt+S' }
  raccourcisPage: { 'save-note': 'Alt+S' },
  moteurRecherche: 'https://www.google.com/search?q={selection}',
  langueCible: 'fr'
});
