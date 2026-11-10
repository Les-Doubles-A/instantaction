// Actions sur les images et les vidéos.
import { copierTexte, copierImage, estUrlWeb, faireErreur } from '../shared/utils.js';

const accepterUrl = (url) => estUrlWeb(url) || /^data:image\//i.test(url || '') || /^blob:/i.test(url || '');

export const actionsMedias = [
  {
    id: 'copy-image',
    name: 'Copier l’image',
    description: 'Copie l’image dans le presse-papiers',
    icon: '🖼️',
    contexts: ['IMAGE'],
    keywords: ['copier', 'image', 'photo'],
    async execute(ctx, api) {
      try {
        await copierImage(ctx.imageUrl);
        api.toast('Image copiée.', 'succes');
      } catch (erreur) {
        console.debug('[InstantAction] copie d’image impossible, repli sur l’adresse', erreur);
        await copierTexte(ctx.imageUrl);
        api.toast('Image protégée : son adresse a été copiée à la place.', 'info');
      }
    }
  },
  {
    id: 'copy-image-url',
    name: 'Copier l’adresse de l’image',
    description: 'Copie l’URL de l’image',
    icon: '🔗',
    contexts: ['IMAGE'],
    keywords: ['copier', 'adresse', 'url', 'image'],
    async execute(ctx, api) {
      await copierTexte(ctx.imageUrl);
      api.toast('Adresse de l’image copiée.', 'succes');
    }
  },
  {
    id: 'download-image',
    name: 'Télécharger l’image',
    description: 'Télécharge l’image dans votre dossier de téléchargements',
    icon: '⬇️',
    contexts: ['IMAGE'],
    keywords: ['télécharger', 'telecharger', 'download', 'image', 'enregistrer'],
    async execute(ctx, api) {
      if (!accepterUrl(ctx.imageUrl)) throw faireErreur('Impossible de télécharger cette image.');
      await api.telecharger(ctx.imageUrl);
      api.toast('Téléchargement lancé.', 'succes');
    }
  },
  {
    id: 'open-image',
    name: 'Ouvrir l’image dans un nouvel onglet',
    description: 'Affiche l’image seule',
    icon: '↗️',
    contexts: ['IMAGE'],
    keywords: ['ouvrir', 'image', 'onglet'],
    async execute(ctx, api) {
      if (!estUrlWeb(ctx.imageUrl)) throw faireErreur('Cette image ne peut pas être ouverte.');
      await api.ouvrirUrl(ctx.imageUrl);
    }
  },
  {
    id: 'copy-video-url',
    name: 'Copier l’adresse de la vidéo',
    description: 'Copie l’URL de la vidéo',
    icon: '🎞️',
    contexts: ['VIDEO'],
    keywords: ['copier', 'vidéo', 'video', 'url'],
    async execute(ctx, api) {
      const url = ctx.videoUrl || ctx.pageUrl;
      await copierTexte(url);
      api.toast('Adresse de la vidéo copiée.', 'succes');
    }
  },
  {
    id: 'open-video',
    name: 'Ouvrir la vidéo dans un nouvel onglet',
    description: 'Ouvre la source de la vidéo',
    icon: '↗️',
    contexts: ['VIDEO'],
    keywords: ['ouvrir', 'vidéo', 'video', 'onglet'],
    async execute(ctx, api) {
      if (!estUrlWeb(ctx.videoUrl)) throw faireErreur('Cette vidéo ne peut pas être ouverte.');
      await api.ouvrirUrl(ctx.videoUrl);
    }
  }
];
