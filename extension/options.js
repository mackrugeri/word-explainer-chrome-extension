const defaults = { askProvider:"ask", activationMode:"selection", theme:"light", language: "en-US", rate: 1, detail: "detailed", translationLanguage: "Urdu", translationFontSize: 20 };
async function loadSettings() {
  const settings = await chrome.storage.local.get(defaults);
  if(!["chatgpt","gemini","ask"].includes(settings.askProvider))settings.askProvider="ask";
  for (const key of ["askProvider", "activationMode", "theme", "language", "rate", "detail", "translationLanguage", "translationFontSize"]) document.getElementById(key).value = settings[key];
}
document.getElementById("settings").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await chrome.storage.local.set({
      askProvider: ["chatgpt","gemini"].includes(document.getElementById("askProvider").value) ? document.getElementById("askProvider").value : "ask",
      activationMode: document.getElementById("activationMode").value === "shortcut" ? "shortcut" : "selection",
      theme: document.getElementById("theme").value === "dark" ? "dark" : "light",
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

globalThis.WordUIIcons?.decorate(document);
