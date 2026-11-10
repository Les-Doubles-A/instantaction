// Actions liées aux notes (stockage local).
import { ajouterNote } from '../shared/storage.js';
import { nomDuSite, faireErreur, genererId } from '../shared/utils.js';

const creerNote = (ctx, texte, type) => ({
  id: genererId(),
  texte,
  url: ctx.pageUrl,
  titre: ctx.titre,
  site: nomDuSite(ctx.pageUrl),
  date: new Date().toISOString(),
  type
});

export const actionsNotes = [
  {
    id: 'save-note',
    name: 'Ajouter aux notes',
    description: 'Enregistre la sélection avec l’URL, le titre et la date',
    icon: '📝',
    shortcut: 'Alt+S',
    contexts: ['TEXT_SELECTION'],
    keywords: ['note', 'sauvegarder', 'enregistrer', 'save'],
    async execute(ctx, api) {
      const texte = ctx.texte.trim();
      if (!texte) throw faireErreur('Sélectionnez d’abord du texte.');
      await ajouterNote(creerNote(ctx, texte, 'selection'));
      api.toast('Ajouté aux notes.', 'succes');
      return { texte: ctx.texte };
    }
  },
  {
    id: 'save-link',
    name: 'Enregistrer le lien',
    description: 'Enregistre l’adresse du lien dans les notes',
    icon: '🔖',
    contexts: ['LINK'],
    keywords: ['lien', 'enregistrer', 'note', 'save'],
    async execute(ctx, api) {
      await ajouterNote(creerNote(ctx, ctx.lienUrl, 'lien'));
      api.toast('Lien enregistré dans les notes.', 'succes');
    }
  },
  {
    id: 'save-page',
    name: 'Enregistrer la page',
    description: 'Ajoute cette page aux notes',
    icon: '📌',
    contexts: ['PAGE'],
    keywords: ['page', 'enregistrer', 'note', 'marque-page'],
    async execute(ctx, api) {
      await ajouterNote(creerNote(ctx, ctx.titre || ctx.pageUrl, 'page'));
      api.toast('Page enregistrée dans les notes.', 'succes');
    }
  },
  {
    id: 'quick-note',
    name: 'Nouvelle note',
    description: 'Écrire une note rapide liée à cette page',
    icon: '✏️',
    shortcut: 'Alt+N',
    contexts: ['PAGE'],
    keywords: ['note', 'ajouter', 'écrire', 'nouvelle'],
    async execute(_ctx, api) {
      await api.ouvrirModeNote();
    }
  },
  {
    id: 'open-notes',
    name: 'Ouvrir mes notes',
    description: 'Consulter les éléments enregistrés',
    icon: '🗒️',
    contexts: ['PAGE'],
    keywords: ['notes', 'consulter', 'ouvrir', 'page'],
    async execute(_ctx, api) {
      await api.ouvrirNotes();
    }
  }
];
