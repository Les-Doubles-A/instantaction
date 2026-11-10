// Actions de copie de texte.
import { nettoyerTexte, copierTexte, faireErreur } from '../shared/utils.js';

export const actionsCopie = [
  {
    id: 'copy-clean',
    name: 'Copier proprement',
    description: 'Copie la sélection sans espaces superflus ni caractères invisibles',
    icon: '✨',
    shortcut: 'Alt+C',
    contexts: ['TEXT_SELECTION'],
    keywords: ['copier', 'nettoyer', 'propre', 'copy'],
    async execute(ctx, api) {
      const texte = nettoyerTexte(ctx.texte);
      if (!texte) throw faireErreur('Il n’y a rien à copier.');
      await copierTexte(texte); // la sélection d'origine n'est jamais modifiée
      api.toast('Texte copié proprement.', 'succes');
      return { texte };
    }
  },
  {
    id: 'copy-text',
    name: 'Copier le texte sélectionné',
    description: 'Copie la sélection telle quelle',
    icon: '📋',
    contexts: ['TEXT_SELECTION'],
    keywords: ['copier', 'copy', 'brut'],
    async execute(ctx, api) {
      await copierTexte(ctx.texte);
      api.toast('Texte copié.', 'succes');
      return { texte: ctx.texte };
    }
  },
  {
    id: 'clean-text',
    name: 'Nettoyer le texte',
    description: 'Étape de workflow : nettoie le texte courant',
    icon: '🧹',
    contexts: ['TEXT_SELECTION'],
    etape: true,
    async execute(ctx) {
      return { texte: nettoyerTexte(ctx.texte) };
    }
  }
];
