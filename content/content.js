// Chargeur : les scripts de contenu classiques ne gèrent pas les modules ES.
// On importe donc dynamiquement le module principal (déclaré dans web_accessible_resources).
(async () => {
  try {
    if (window.__instantActionCharge) return;
    window.__instantActionCharge = true;
    await import(chrome.runtime.getURL('content/main.js'));
  } catch (erreur) {
    console.debug('[InstantAction] chargement impossible sur cette page', erreur);
  }
})();
