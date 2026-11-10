// Détection du contexte à partir de la sélection et de l'élément ciblé uniquement (pas d'analyse globale de la page).
import { CONTEXTES } from '../shared/types.js';

const SEL_CODE = 'pre, code, kbd, samp';
const TYPES_INPUT_TEXTE = new Set(['text', 'search', 'url', 'email', 'tel', 'number', 'password']);

function racineEditable(el) {
  if (!(el instanceof Element)) return null;
  if (el instanceof HTMLTextAreaElement) return el;
  if (el instanceof HTMLInputElement) {
    return TYPES_INPUT_TEXTE.has((el.getAttribute('type') || 'text').toLowerCase()) ? el : null;
  }
  if (el.isContentEditable) {
    let hote = el;
    while (hote.parentElement?.isContentEditable) hote = hote.parentElement;
    return hote;
  }
  return null;
}

const typeChamp = (champ) => (champ instanceof HTMLInputElement ? CONTEXTES.INPUT : CONTEXTES.TEXTAREA);

function trouverChamp(cible) {
  for (const el of [document.activeElement, cible]) {
    const champ = racineEditable(el);
    if (champ) return champ;
  }
  return null;
}

function lireSaisie(champ) {
  if (!champ) return { texte: window.getSelection()?.toString() ?? '', tout: '' };
  if (typeof champ.selectionStart === 'number' || 'value' in champ) {
    try {
      const { selectionStart: debut, selectionEnd: fin, value } = champ;
      if (typeof debut === 'number') return { texte: value.slice(debut, fin), debut, fin, tout: value };
    } catch { /* type de champ sans sélection */ }
    return { texte: '', tout: champ.value ?? '' };
  }
  const selection = window.getSelection();
  const dansChamp = selection && selection.rangeCount && champ.contains(selection.anchorNode);
  return { texte: dansChamp ? selection.toString() : '', tout: champ.innerText ?? '' };
}

/**
 * Construit le contexte complet d'une interaction.
 * `surcharges` permet de fournir les infos du menu contextuel (linkUrl, srcUrl, mediaType, selectionText).
 */
export function construireContexte(cible, surcharges = {}) {
  const el = cible instanceof Element ? cible : cible?.parentElement ?? null;
  const base = { pageUrl: location.href, titre: document.title, element: el };
  const champ = trouverChamp(el);

  if (champ instanceof HTMLInputElement && champ.type === 'password') {
    return { ...base, types: [CONTEXTES.UNKNOWN], type: CONTEXTES.UNKNOWN, texte: '' }; // jamais d'action sur un mot de passe
  }

  const saisie = lireSaisie(champ);
  let texte = saisie.texte;
  if (!texte.trim() && !champ && surcharges.selectionText) texte = surcharges.selectionText;

  const lien = el?.closest?.('a[href]');
  const lienUrl = surcharges.linkUrl ?? lien?.href ?? null;
  const img = el?.closest?.('img');
  const imageUrl = (surcharges.mediaType === 'image' && surcharges.srcUrl) || (img ? img.currentSrc || img.src : null);
  const video = el?.closest?.('video');
  const videoUrl = (surcharges.mediaType === 'video' && surcharges.srcUrl) || (video ? video.currentSrc || video.src : null);
  const blocCode = el?.closest?.(SEL_CODE);
  const selectionDansCode = texte.trim() && !champ && window.getSelection()?.anchorNode?.parentElement?.closest?.(SEL_CODE);
  const table = el?.closest?.('table');

  const types = [];
  if (texte.trim()) types.push(CONTEXTES.TEXT_SELECTION);
  if (lienUrl) types.push(CONTEXTES.LINK);
  if (imageUrl) types.push(CONTEXTES.IMAGE);
  if (videoUrl || video || surcharges.mediaType === 'video') types.push(CONTEXTES.VIDEO);
  if (champ) types.push(typeChamp(champ));
  if (selectionDansCode || (!texte.trim() && blocCode)) types.push(CONTEXTES.CODE);
  if (table) types.push(CONTEXTES.TABLE);
  types.push(CONTEXTES.PAGE);

  const pre = el?.closest?.('pre') ?? blocCode;
  let plageEditable = null;
  if (champ && typeof champ.selectionStart !== 'number') {
    const selection = window.getSelection();
    if (selection?.rangeCount && champ.contains(selection.anchorNode)) plageEditable = selection.getRangeAt(0).cloneRange();
  }

  return {
    ...base,
    types,
    type: types[0],
    texte,
    champ,
    texteChamp: champ ? (texte.trim() ? texte : saisie.tout) : '',
    plageChamp: saisie.debut !== undefined ? { debut: saisie.debut, fin: saisie.fin } : null,
    plageEditable,
    lienUrl,
    imageUrl,
    videoUrl,
    code: texte.trim() ? texte : pre?.innerText ?? '',
    tableau: table ?? null
  };
}

/** Retourne le contexte principal : TEXT_SELECTION, LINK, IMAGE, VIDEO, INPUT, TEXTAREA, CODE, TABLE, PAGE ou UNKNOWN. */
export function detectContext(cible, surcharges) {
  return construireContexte(cible, surcharges).type;
}
