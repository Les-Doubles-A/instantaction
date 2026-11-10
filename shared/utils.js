// Utilitaires partagés. Aucun accès au DOM à l'import : le service worker les charge aussi.

export function faireErreur(message) {
  const erreur = new Error(message);
  erreur.convivial = message; // message affichable à l'utilisateur final
  return erreur;
}

export const genererId = () =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Minuscules sans accents, pour la recherche. */
export const normaliser = (texte) =>
  (texte || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Nettoyage du texte copié : espaces, retours à la ligne, caractères invisibles. */
export function nettoyerTexte(brut) {
  let texte = String(brut ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200B-\u200F\u2060\uFEFF\u00AD\u202A-\u202E]/g, '') // invisibles et contrôles bidi
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' '); // espaces spéciaux
  texte = texte
    .split('\n')
    .map((ligne) => ligne.replace(/[ \t]+/g, ' ').trim())
    .join('\n');
  return texte.replace(/\n{3,}/g, '\n\n').trim(); // les paragraphes sont conservés
}

export const titreCas = (texte) =>
  texte.toLowerCase().replace(/(^|[\s\-'’(])(\p{L})/gu, (_m, sep, lettre) => sep + lettre.toUpperCase());

/** Résumé extractif local (aucun envoi réseau). Renvoie '' si le texte est déjà court. */
export function resumerLocalement(texte, nbPhrases = 3) {
  const phrases = texte.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+/).filter((p) => p.length > 20);
  if (phrases.length <= nbPhrases) return '';
  const videsMots = new Set(['dans', 'pour', 'avec', 'mais', 'donc', 'that', 'this', 'with', 'from', 'nous', 'vous', 'sont', 'plus', 'comme', 'cette', 'cela', 'aussi', 'leur', 'leurs', 'entre']);
  const frequences = new Map();
  for (const mot of normaliser(texte).match(/\p{L}{4,}/gu) || []) {
    if (!videsMots.has(mot)) frequences.set(mot, (frequences.get(mot) || 0) + 1);
  }
  const notees = phrases.map((phrase, rang) => ({
    phrase,
    rang,
    score: (normaliser(phrase).match(/\p{L}{4,}/gu) || []).reduce((t, m) => t + (frequences.get(m) || 0), 0) / Math.sqrt(phrase.length)
  }));
  return notees
    .sort((a, b) => b.score - a.score)
    .slice(0, nbPhrases)
    .sort((a, b) => a.rang - b.rang)
    .map((x) => x.phrase)
    .join(' ');
}

/** Mise en forme simple du code : JSON, accolades, ou nettoyage seul (Python, etc.). */
export function formaterCode(code) {
  try {
    return JSON.stringify(JSON.parse(code), null, 2);
  } catch { /* pas du JSON */ }
  const sansEspacesFin = code.replace(/\t/g, '  ').split('\n').map((l) => l.replace(/\s+$/, ''));
  if (!/[{};]/.test(code)) return sansEspacesFin.join('\n').trim();
  let niveau = 0;
  const sortie = [];
  for (const ligne of sansEspacesFin) {
    const l = ligne.trim();
    if (!l) { sortie.push(''); continue; }
    const sansChaines = l.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '');
    const ouvrants = (sansChaines.match(/[{(\[]/g) || []).length;
    const fermants = (sansChaines.match(/[})\]]/g) || []).length;
    const debutFermant = /^[})\]]/.test(sansChaines);
    if (debutFermant) niveau = Math.max(0, niveau - 1);
    sortie.push('  '.repeat(niveau) + l);
    niveau = Math.max(0, niveau + ouvrants - fermants + (debutFermant ? 1 : 0));
  }
  return sortie.join('\n').trim();
}

/** Remplace {selection}, {url}, {title} dans un modèle d'URL. */
export const construireUrl = (modele, valeurs) =>
  modele.replace(/\{(selection|url|title)\}/g, (_m, cle) => encodeURIComponent(valeurs[cle] ?? ''));

export const estUrlWeb = (url) => /^https?:\/\//i.test(url || '');

export function nomDuSite(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

export function tableauVersTsv(table) {
  return [...table.rows]
    .map((ligne) => [...ligne.cells].map((c) => (c.innerText ?? c.textContent ?? '').replace(/\s+/g, ' ').trim()).join('\t'))
    .join('\n');
}

/** Combinaison clavier normalisée, ex. "Alt+Shift+O". Chaîne vide pour une touche modificatrice seule. */
export function combinaisonClavier(e) {
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return '';
  const parties = [];
  if (e.ctrlKey) parties.push('Ctrl');
  if (e.altKey) parties.push('Alt');
  if (e.shiftKey) parties.push('Shift');
  if (e.metaKey) parties.push('Meta');
  const code = e.code || '';
  let touche = e.key;
  if (code.startsWith('Key')) touche = code.slice(3);
  else if (code.startsWith('Digit')) touche = code.slice(5);
  else if (code === 'Space') touche = 'Space';
  else if (touche.length === 1) touche = touche.toUpperCase();
  parties.push(touche);
  return parties.join('+');
}

// ---------- Fonctions utilisant le DOM (appelées uniquement depuis une page) ----------

/** Mémorise la sélection et le focus pour pouvoir les restaurer sans jamais les modifier. */
export function capturerSelection() {
  const selection = window.getSelection();
  const plages = [];
  for (let i = 0; i < (selection?.rangeCount || 0); i++) plages.push(selection.getRangeAt(i).cloneRange());
  const actif = document.activeElement;
  const cap = { plages, actif, debut: null, fin: null };
  try {
    if (actif && typeof actif.selectionStart === 'number') {
      cap.debut = actif.selectionStart;
      cap.fin = actif.selectionEnd;
    }
  } catch { /* champ sans sélection */ }
  return cap;
}

export function restaurerSelection(cap) {
  if (!cap) return;
  try {
    if (cap.actif && cap.actif !== document.body && cap.actif.isConnected) cap.actif.focus?.({ preventScroll: true });
    if (cap.debut !== null) {
      cap.actif.setSelectionRange(cap.debut, cap.fin);
    } else if (cap.plages.length) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      cap.plages.forEach((plage) => selection.addRange(plage));
    }
  } catch (erreur) {
    console.debug('[InstantAction] restauration de la sélection impossible', erreur);
  }
}

/** Copie du texte ; la sélection d'origine reste intacte. */
export async function copierTexte(texte) {
  const cap = capturerSelection();
  try {
    if (navigator.clipboard?.writeText && document.hasFocus()) {
      await navigator.clipboard.writeText(texte);
      return;
    }
  } catch { /* repli sur execCommand */ }
  const zone = document.createElement('textarea');
  zone.value = texte;
  zone.setAttribute('readonly', '');
  zone.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;';
  document.documentElement.appendChild(zone);
  zone.select();
  let reussi = false;
  try { reussi = document.execCommand('copy'); } catch { reussi = false; }
  zone.remove();
  restaurerSelection(cap);
  if (!reussi) throw faireErreur('Impossible de copier cet élément.');
}

/** Copie une image dans le presse-papiers (convertie en PNG). */
export async function copierImage(url) {
  const reponse = await fetch(url);
  const blob = await reponse.blob();
  const bitmap = await createImageBitmap(blob);
  const canevas = new OffscreenCanvas(bitmap.width, bitmap.height);
  canevas.getContext('2d').drawImage(bitmap, 0, 0);
  const png = await canevas.convertToBlob({ type: 'image/png' });
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}

/** Remplace (ou insère) du texte dans le champ du contexte, en conservant l'historique d'annulation. */
export function remplacerDansChamp(ctx, nouveauTexte, { toutSiVide = true } = {}) {
  const champ = ctx.champ;
  if (!champ || !champ.isConnected) throw faireErreur('Le champ de texte est introuvable.');
  champ.focus({ preventScroll: true });
  if (typeof champ.selectionStart === 'number') {
    let { debut, fin } = ctx.plageChamp ?? { debut: 0, fin: champ.value.length };
    if (debut === fin && toutSiVide) { debut = 0; fin = champ.value.length; }
    champ.setSelectionRange(debut, fin);
    if (!document.execCommand('insertText', false, nouveauTexte)) {
      champ.setRangeText(nouveauTexte, debut, fin, 'end');
      champ.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } else {
    const selection = window.getSelection();
    selection.removeAllRanges();
    if (ctx.plageEditable && (!ctx.plageEditable.collapsed || !toutSiVide)) {
      selection.addRange(ctx.plageEditable);
    } else {
      const plage = document.createRange();
      plage.selectNodeContents(champ);
      selection.addRange(plage);
    }
    document.execCommand('insertText', false, nouveauTexte);
  }
}

// ---------- Aides pour les pages de l'extension (popup, options, notes) ----------

export function h(balise, attrs = {}, ...enfants) {
  const el = document.createElement(balise);
  for (const [cle, valeur] of Object.entries(attrs || {})) {
    if (valeur == null || valeur === false) continue;
    if (cle === 'class') el.className = valeur;
    else if (cle.startsWith('on')) el.addEventListener(cle.slice(2), valeur);
    else if (valeur === true) el.setAttribute(cle, '');
    else el.setAttribute(cle, valeur);
  }
  for (const enfant of enfants.flat()) {
    if (enfant == null || enfant === false) continue;
    el.append(enfant.nodeType ? enfant : document.createTextNode(String(enfant)));
  }
  return el;
}

export function appliquerThemePage(reglages) {
  document.documentElement.dataset.theme = reglages.theme;
  document.documentElement.dataset.densite = reglages.densite;
}
