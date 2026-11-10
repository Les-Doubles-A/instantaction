// Actions sur le code et les tableaux.
import { copierTexte, formaterCode, tableauVersTsv, construireUrl, estUrlWeb, faireErreur } from '../shared/utils.js';

const lireCode = (ctx) => {
  const code = (ctx.code || '').trim();
  if (!code) throw faireErreur('Aucun code à traiter.');
  return code.slice(0, 200000);
};

export const actionsCode = [
  {
    id: 'copy-code',
    name: 'Copier le code',
    description: 'Copie le bloc de code (ou la sélection)',
    icon: '💻',
    contexts: ['CODE'],
    keywords: ['copier', 'code', 'bloc'],
    async execute(ctx, api) {
      await copierTexte(lireCode(ctx));
      api.toast('Code copié.', 'succes');
    }
  },
  {
    id: 'format-code',
    name: 'Formater le code',
    description: 'Met en forme le code (JSON, accolades) et le copie',
    icon: '🧩',
    contexts: ['CODE'],
    keywords: ['formater', 'indenter', 'format', 'code', 'json'],
    async execute(ctx, api) {
      await copierTexte(formaterCode(lireCode(ctx)));
      api.toast('Code formaté et copié.', 'succes');
    }
  },
  {
    id: 'open-editor',
    name: 'Ouvrir dans un éditeur',
    description: 'Copie le code et ouvre un éditeur en ligne',
    icon: '🛠️',
    contexts: ['CODE'],
    keywords: ['éditeur', 'editeur', 'editor', 'vscode', 'code'],
    async execute(ctx, api) {
      await copierTexte(lireCode(ctx));
      await api.ouvrirUrl('https://vscode.dev/');
      api.toast('Code copié : collez-le dans l’éditeur.', 'info', 3500);
    }
  },
  {
    id: 'explain-code',
    name: 'Expliquer le code',
    description: 'Lance une recherche pour comprendre ce code',
    icon: '💡',
    contexts: ['CODE'],
    keywords: ['expliquer', 'comprendre', 'explain', 'code'],
    async execute(ctx, api) {
      const extrait = lireCode(ctx).slice(0, 400);
      const url = construireUrl(api.reglages.moteurRecherche, { selection: `expliquer ce code : ${extrait}` });
      if (!estUrlWeb(url)) throw faireErreur('Le moteur de recherche configuré est invalide.');
      await api.ouvrirUrl(url);
    }
  },
  {
    id: 'copy-table',
    name: 'Copier le tableau',
    description: 'Copie le tableau (colonnes séparées par des tabulations)',
    icon: '📊',
    contexts: ['TABLE'],
    keywords: ['copier', 'tableau', 'table', 'excel', 'tsv'],
    async execute(ctx, api) {
      if (!ctx.tableau) throw faireErreur('Tableau introuvable.');
      await copierTexte(tableauVersTsv(ctx.tableau));
      api.toast('Tableau copié.', 'succes');
    }
  }
];
