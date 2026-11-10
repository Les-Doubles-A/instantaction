// Petite barre d'actions affichée près de la sélection de texte.
import { obtenirUi, estDansUi } from './ui.js';
import { construireContexte } from './context-detector.js';
import { getActionsForContext } from '../shared/commands.js';

export function creerBarre({ obtenirReglages, obtenirRegistre, executer, ouvrirPalette }) {
  let barre = null;
  let retirerEcouteurs = null;

  function masquer() {
    barre?.remove();
    barre = null;
    retirerEcouteurs?.();
    retirerEcouteurs = null;
  }

  function creerBouton(action, ctx) {
    const bouton = document.createElement('button');
    bouton.className = 'ia-btn-barre';
    bouton.type = 'button';
    bouton.title = action.description;
    bouton.textContent = `${action.icon} ${action.name.split(' ')[0] === 'Ajouter' ? 'Notes' : action.name}`;
    bouton.addEventListener('click', () => { masquer(); executer(action, ctx); });
    return bouton;
  }

  async function afficher(ctx, rect) {
    const actions = getActionsForContext(ctx, obtenirRegistre(), obtenirReglages());
    if (!actions.length) return;
    const c = await obtenirUi();
    masquer();
    barre = document.createElement('div');
    barre.className = 'ia-barre';
    barre.setAttribute('role', 'toolbar');
    barre.setAttribute('aria-label', 'Actions rapides');
    // Garde la sélection active : on ne vole jamais le focus.
    barre.addEventListener('mousedown', (e) => e.preventDefault());

    const visibles = actions.slice(0, 3);
    const reste = actions.slice(3);
    visibles.forEach((a) => barre.appendChild(creerBouton(a, ctx)));

    const plus = document.createElement('button');
    plus.className = 'ia-btn-barre ia-plus';
    plus.type = 'button';
    plus.textContent = '+';
    plus.title = 'Autres actions';
    plus.setAttribute('aria-haspopup', 'true');
    plus.addEventListener('click', () => {
      if (!reste.length) { masquer(); ouvrirPalette(); return; }
      const existant = barre.querySelector('.ia-menu');
      if (existant) { existant.remove(); return; }
      const menu = document.createElement('div');
      menu.className = 'ia-menu';
      menu.setAttribute('role', 'menu');
      reste.forEach((a) => {
        const entree = creerBouton(a, ctx);
        entree.className = 'ia-menu-item';
        entree.setAttribute('role', 'menuitem');
        menu.appendChild(entree);
      });
      barre.appendChild(menu);
    });
    barre.appendChild(plus);
    c.appendChild(barre);

    const largeur = barre.offsetWidth;
    const hauteur = barre.offsetHeight;
    const x = Math.max(8, Math.min(rect.left + rect.width / 2 - largeur / 2, window.innerWidth - largeur - 8));
    let y = rect.top - hauteur - 8;
    if (y < 8) y = Math.min(rect.bottom + 8, window.innerHeight - hauteur - 8);
    barre.style.left = `${x}px`;
    barre.style.top = `${y}px`;

    // Les écouteurs ne vivent que pendant l'affichage de la barre.
    const surSouris = (e) => { if (!estDansUi(e)) masquer(); };
    const surDefilement = () => masquer();
    const surTouche = (e) => { if (e.key === 'Escape') masquer(); };
    const surSelection = () => { if (!window.getSelection()?.toString().trim()) masquer(); };
    document.addEventListener('mousedown', surSouris, true);
    document.addEventListener('scroll', surDefilement, true);
    document.addEventListener('keydown', surTouche, true);
    document.addEventListener('selectionchange', surSelection);
    retirerEcouteurs = () => {
      document.removeEventListener('mousedown', surSouris, true);
      document.removeEventListener('scroll', surDefilement, true);
      document.removeEventListener('keydown', surTouche, true);
      document.removeEventListener('selectionchange', surSelection);
    };
  }

  /** Appelée après un relâchement de souris ou une sélection au clavier. */
  function evaluer(evenement) {
    const reglages = obtenirReglages();
    if (!reglages.actif || !reglages.afficherBarre) return;
    setTimeout(() => {
      if (estDansUi(evenement)) return;
      const ctx = construireContexte(evenement.target);
      if (!ctx.types.includes('TEXT_SELECTION')) { masquer(); return; }
      let rect = null;
      if (!ctx.champ) {
        const selection = window.getSelection();
        if (selection?.rangeCount) rect = selection.getRangeAt(0).getBoundingClientRect();
      }
      if (!rect || (!rect.width && !rect.height)) {
        if (typeof evenement.clientX === 'number') {
          rect = { left: evenement.clientX, right: evenement.clientX, top: evenement.clientY - 10, bottom: evenement.clientY + 10, width: 0, height: 20 };
        } else if (ctx.champ) {
          rect = ctx.champ.getBoundingClientRect();
        } else return;
      }
      afficher(ctx, rect);
    }, 10);
  }

  return { evaluer, masquer, afficher };
}
