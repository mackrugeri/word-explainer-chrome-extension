const defaults = { language: "en-US", rate: 1, detail: "detailed", translationLanguage: "Urdu", translationFontSize: 20 };
async function loadSettings() {
  const settings = await chrome.storage.local.get(defaults);
  for (const key of ["language", "rate", "detail", "translationLanguage", "translationFontSize"]) document.getElementById(key).value = settings[key];
}
document.getElementById("settings").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await chrome.storage.local.set({
      language: document.getElementById("language").value,
      rate: Number(document.getElementById("rate").value),
      detail: document.getElementById("detail").value,
      translationLanguage: document.getElementById("translationLanguage").value,
      translationFontSize: Math.max(14, Math.min(32, Number(document.getElementById("translationFontSize").value) || 20))
    });
    document.getElementById("status").textContent = "Settings saved.";
  } catch {
    document.getElementById("status").textContent = "Unable to save settings. Try again.";
  }
});
loadSettings().catch(() => { document.getElementById("status").textContent = "Unable to load settings."; });
