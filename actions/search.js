// Recherche et définition.
import { construireUrl, faireErreur } from '../shared/utils.js';

export const actionsRecherche = [
  {
    id: 'search',
    name: 'Rechercher',
    description: 'Lance une recherche web avec la sélection',
    icon: '🔍',
    contexts: ['TEXT_SELECTION'],
    keywords: ['chercher', 'google', 'web', 'search'],
    async execute(ctx, api) {
      const texte = ctx.texte.trim().slice(0, 500);
      if (!texte) throw faireErreur('Sélectionnez d’abord du texte.');
      await api.ouvrirUrl(construireUrl(api.reglages.moteurRecherche, { selection: texte, url: ctx.pageUrl, title: ctx.titre }));
    }
  },
  {
    id: 'define',
    name: 'Rechercher cette définition',
    description: 'Cherche la définition du mot ou de l’expression sélectionnée',
    icon: '📖',
    contexts: ['TEXT_SELECTION'],
    keywords: ['définition', 'definition', 'dictionnaire', 'sens'],
    async execute(ctx, api) {
      const texte = ctx.texte.trim().slice(0, 200);
      if (!texte) throw faireErreur('Sélectionnez d’abord du texte.');
      await api.ouvrirUrl(construireUrl(api.reglages.moteurRecherche, { selection: `définition ${texte}` }));
    }
  }
];
