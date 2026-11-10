// Outils de texte : champs de saisie, transformations, résumé.
import { nettoyerTexte, titreCas, resumerLocalement, copierTexte, remplacerDansChamp, faireErreur } from '../shared/utils.js';

function creerTransformation(id, nom, icone, mots, fn) {
  return {
    id,
    name: nom,
    description: 'Transforme le texte du champ ou de la sélection',
    icon: icone,
    contexts: ['INPUT', 'TEXTAREA', 'TEXT_SELECTION'],
    keywords: ['transformer', 'casse', ...mots],
    async execute(ctx, api) {
      const source = ctx.champ ? ctx.texteChamp : ctx.texte;
      if (!source) throw faireErreur('Il n’y a aucun texte à transformer.');
      const resultat = fn(source);
      if (ctx.champ) {
        remplacerDansChamp(ctx, resultat);
        api.toast('Texte transformé.', 'succes');
      } else {
        await copierTexte(resultat);
        api.toast('Résultat copié dans le presse-papiers.', 'succes');
      }
      return { texte: resultat };
    }
  };
}

export const actionsTexte = [
  {
    id: 'paste-plain',
    name: 'Coller sans formatage',
    description: 'Colle le contenu du presse-papiers en texte brut',
    icon: '📥',
    contexts: ['INPUT', 'TEXTAREA'],
    keywords: ['coller', 'paste', 'brut', 'formatage'],
    async execute(ctx, api) {
      let texte = '';
      try {
        texte = await navigator.clipboard.readText();
      } catch {
        throw faireErreur('Impossible de coller. Autorisez l’accès au presse-papiers pour ce site.');
      }
      if (!texte) throw faireErreur('Le presse-papiers est vide.');
      remplacerDansChamp(ctx, texte, { toutSiVide: false });
      api.toast('Texte collé sans formatage.', 'succes');
    }
  },
  {
    id: 'clean-field',
    name: 'Nettoyer le texte du champ',
    description: 'Supprime espaces superflus et caractères invisibles',
    icon: '🧹',
    contexts: ['INPUT', 'TEXTAREA'],
    keywords: ['nettoyer', 'champ', 'clean'],
    async execute(ctx, api) {
      const nettoye = nettoyerTexte(ctx.texteChamp);
      if (!ctx.texteChamp) throw faireErreur('Le champ est vide.');
      remplacerDansChamp(ctx, nettoye);
      api.toast('Texte nettoyé.', 'succes');
      return { texte: nettoye };
    }
  },
  {
    id: 'count-chars',
    name: 'Compter les caractères',
    description: 'Affiche caractères, mots et lignes',
    icon: '🔢',
    contexts: ['INPUT', 'TEXTAREA', 'TEXT_SELECTION'],
    keywords: ['compter', 'caractères', 'caracteres', 'mots', 'longueur'],
    async execute(ctx, api) {
      const source = ctx.champ ? ctx.texteChamp : ctx.texte;
      const mots = source.trim() ? source.trim().split(/\s+/).length : 0;
      const lignes = source ? source.split('\n').length : 0;
      api.toast(`${source.length} caractères · ${mots} mots · ${lignes} lignes`, 'info', 4000);
    }
  },
  creerTransformation('upper', 'Mettre en MAJUSCULES', '🔠', ['majuscules', 'upper'], (t) => t.toUpperCase()),
  creerTransformation('lower', 'Mettre en minuscules', '🔡', ['minuscules', 'lower'], (t) => t.toLowerCase()),
  creerTransformation('title', 'Mettre en Casse Titre', '🅰️', ['titre', 'capitaliser'], titreCas),
  {
    id: 'summarize',
    name: 'Résumer',
    description: 'Résumé local de la sélection (aucun envoi sur Internet)',
    icon: '📄',
    contexts: ['TEXT_SELECTION'],
    keywords: ['résumé', 'resume', 'synthèse', 'summary'],
    async execute(ctx, api) {
      const resume = resumerLocalement(ctx.texte, 3);
      if (!resume) {
        api.toast('Ce texte est déjà court : sélectionnez-en davantage.', 'info');
        return;
      }
      await api.afficherResultat('Résumé', resume);
      return { texte: resume };
    }
  }
];
