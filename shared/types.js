// Types et énumérations partagés.

/** Contextes détectables sur une page. */
export const CONTEXTES = Object.freeze({
  TEXT_SELECTION: 'TEXT_SELECTION',
  LINK: 'LINK',
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  INPUT: 'INPUT',
  TEXTAREA: 'TEXTAREA',
  CODE: 'CODE',
  TABLE: 'TABLE',
  PAGE: 'PAGE',
  UNKNOWN: 'UNKNOWN'
});

export const LIBELLES_CONTEXTES = Object.freeze({
  TEXT_SELECTION: 'Sélection de texte',
  LINK: 'Lien',
  IMAGE: 'Image',
  VIDEO: 'Vidéo',
  INPUT: 'Champ de texte',
  TEXTAREA: 'Zone de texte',
  CODE: 'Code',
  TABLE: 'Tableau',
  PAGE: 'Page',
  UNKNOWN: 'Inconnu'
});

/**
 * @typedef {Object} Action
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} icon
 * @property {string} [shortcut]        Raccourci indicatif (Chrome ou dans la page)
 * @property {string[]} contexts        Contextes compatibles
 * @property {string[]} [keywords]      Mots-clés de recherche
 * @property {boolean} [etape]          Réservée aux workflows (masquée des listes)
 * @property {(ctx: Object, api: Object) => Promise<{texte?: string}|void>} execute
 */
