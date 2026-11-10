// Registre d'actions : actions intégrées + actions personnalisées + workflows.
import { ACTIONS_INTEGREES } from '../actions/index.js';
import { construireUrl, estUrlWeb, faireErreur } from './utils.js';

function actionDepuisPerso(perso) {
  return {
    id: `perso-${perso.id}`,
    name: perso.nom,
    description: `Ouvre ${perso.modele}`,
    icon: perso.icone || '🔗',
    shortcut: perso.raccourci || undefined,
    contexts: perso.contextes?.length ? perso.contextes : ['TEXT_SELECTION'],
    keywords: ['personnalisée', 'custom'],
    perso: true,
    async execute(ctx, api) {
      const url = construireUrl(perso.modele, { selection: ctx.texte, url: ctx.pageUrl, title: ctx.titre });
      if (!estUrlWeb(url)) throw faireErreur("Cette action personnalisée n'a pas d'adresse valide.");
      await api.ouvrirUrl(url);
    }
  };
}

function actionDepuisWorkflow(flux) {
  return {
    id: `flux-${flux.id}`,
    name: flux.nom,
    description: 'Workflow : ' + flux.etapes.join(' → '),
    icon: '⚡',
    shortcut: flux.raccourci || undefined,
    contexts: ['TEXT_SELECTION'],
    keywords: ['workflow', 'automatisation'],
    perso: true,
    async execute(ctx, api) {
      let courant = ctx;
      for (const idEtape of flux.etapes) {
        const etape = api.registre.find((a) => a.id === idEtape && !a.id.startsWith('flux-'));
        if (!etape) continue;
        const resultat = await etape.execute(courant, api);
        if (resultat?.texte !== undefined) courant = { ...courant, texte: resultat.texte };
      }
    }
  };
}

export function construireRegistre(reglages) {
  return [
    ...ACTIONS_INTEGREES,
    ...(reglages.actionsPerso || []).map(actionDepuisPerso),
    ...(reglages.workflows || []).map(actionDepuisWorkflow)
  ];
}

export const estCompatible = (action, types) => action.contexts.some((c) => types.includes(c));
export const estActive = (action, reglages) => !reglages.actionsDesactivees.includes(action.id);

export function trierActions(actions, reglages, favorisDabord = true) {
  const position = (id) => { const i = reglages.ordre.indexOf(id); return i < 0 ? 1e6 : i; };
  const rangFavori = (id) => (favorisDabord && reglages.favoris.includes(id) ? 0 : 1);
  return [...actions].sort((a, b) => rangFavori(a.id) - rangFavori(b.id) || position(a.id) - position(b.id));
}

/**
 * Retourne uniquement les actions pertinentes pour un contexte.
 * `contexte` : chaîne (ex. "LINK"), tableau de types, ou objet de contexte.
 */
export function getActionsForContext(contexte, registre, reglages) {
  const types = Array.isArray(contexte) ? contexte : contexte?.types ?? [contexte];
  return trierActions(
    registre.filter((a) => !a.etape && estActive(a, reglages) && estCompatible(a, types)),
    reglages
  );
}

/** Table combinaison → id d'action pour les raccourcis gérés dans la page. */
export function listerRaccourcisPage(reglages, registre) {
  const table = new Map();
  for (const action of registre) if (action.perso && action.shortcut) table.set(action.shortcut, action.id);
  for (const [id, combo] of Object.entries(reglages.raccourcisPage || {})) if (combo) table.set(combo, id);
  return table;
}
