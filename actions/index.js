// Registre des actions intégrées.
// Pour ajouter une action : créez un fichier exportant un tableau d'actions, puis ajoutez-le ici.
import { actionsCopie } from './copy-clean.js';
import { actionsRecherche } from './search.js';
import { actionsTraduction } from './translate.js';
import { actionsNotes } from './save-note.js';
import { actionsTexte } from './text-tools.js';
import { actionsLiens } from './open-link.js';
import { actionsMedias } from './download-image.js';
import { actionsCode } from './code-tools.js';

export const ACTIONS_INTEGREES = [
  ...actionsCopie,
  ...actionsRecherche,
  ...actionsTraduction,
  ...actionsNotes,
  ...actionsTexte,
  ...actionsLiens,
  ...actionsMedias,
  ...actionsCode
];
