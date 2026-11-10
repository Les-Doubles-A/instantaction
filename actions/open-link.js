// Actions sur les liens et sur la page.
import { copierTexte, estUrlWeb, faireErreur } from '../shared/utils.js';

function verifierLien(ctx) {
  if (!estUrlWeb(ctx.lienUrl)) throw faireErreur('Ce lien ne peut pas être ouvert.');
  return ctx.lienUrl;
}

export const actionsLiens = [
  {
    id: 'open-link',
    name: 'Ouvrir dans un nouvel onglet',
    description: 'Ouvre le lien dans un nouvel onglet',
    icon: '↗️',
    contexts: ['LINK'],
    keywords: ['ouvrir', 'lien', 'onglet', 'open'],
    async execute(ctx, api) {
      await api.ouvrirUrl(verifierLien(ctx));
    }
  },
  {
    id: 'copy-link-url',
    name: 'Copier l’URL du lien',
    description: 'Copie l’adresse du lien',
    icon: '🔗',
    contexts: ['LINK'],
    keywords: ['copier', 'url', 'adresse', 'lien'],
    async execute(ctx, api) {
      await copierTexte(ctx.lienUrl);
      api.toast('URL du lien copiée.', 'succes');
    }
  },
  {
    id: 'preview-link',
    name: 'Aperçu du lien',
    description: 'Ouvre le lien dans une petite fenêtre',
    icon: '👁️',
    contexts: ['LINK'],
    keywords: ['aperçu', 'apercu', 'preview', 'fenêtre'],
    async execute(ctx, api) {
      await api.apercu(verifierLien(ctx));
    }
  },
  {
    id: 'copy-page-url',
    name: 'Copier URL',
    description: 'Copie l’adresse de la page courante',
    icon: '🔗',
    contexts: ['PAGE'],
    keywords: ['copier', 'url', 'adresse', 'page'],
    async execute(ctx, api) {
      await copierTexte(ctx.pageUrl);
      api.toast('URL de la page copiée.', 'succes');
    }
  },
  {
    id: 'copy-page-title',
    name: 'Copier le titre de la page',
    description: 'Copie le titre de la page courante',
    icon: '🏷️',
    contexts: ['PAGE'],
    keywords: ['copier', 'titre', 'page'],
    async execute(ctx, api) {
      await copierTexte(ctx.titre);
      api.toast('Titre copié.', 'succes');
    }
  }
];
