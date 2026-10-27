const defaults = { language: "en-US", rate: 1, detail: "detailed", showToolbar: true };
async function loadSettings() {
  const settings = await chrome.storage.local.get(defaults);
  for (const key of ["language", "rate", "detail"]) document.getElementById(key).value = settings[key];
  document.getElementById("showToolbar").checked = settings.showToolbar;
}
document.getElementById("settings").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await chrome.storage.local.set({
      language: document.getElementById("language").value,
      rate: Number(document.getElementById("rate").value),
      detail: document.getElementById("detail").value,
      showToolbar: document.getElementById("showToolbar").checked
    });
    document.getElementById("status").textContent = "Settings saved.";
  } catch {
    document.getElementById("status").textContent = "Unable to save settings. Try again.";
  }
});
loadSettings().catch(() => { document.getElementById("status").textContent = "Unable to load settings."; });
