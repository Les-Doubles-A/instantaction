// Traduction : ouvre Google Traduction dans un nouvel onglet (uniquement à la demande de l'utilisateur).
import { faireErreur } from '../shared/utils.js';

export const actionsTraduction = [
  {
    id: 'translate',
    name: 'Traduire',
    description: 'Traduit la sélection dans votre langue cible',
    icon: '🌐',
    contexts: ['TEXT_SELECTION'],
    keywords: ['traduction', 'langue', 'translate'],
    async execute(ctx, api) {
      const texte = ctx.texte.trim().slice(0, 4000);
      if (!texte) throw faireErreur('Sélectionnez d’abord du texte.');
      const langue = encodeURIComponent(api.reglages.langueCible || 'fr');
      await api.ouvrirUrl(`https://translate.google.com/?sl=auto&tl=${langue}&op=translate&text=${encodeURIComponent(texte)}`);
    }
  }
];
