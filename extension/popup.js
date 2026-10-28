const settingsButton = document.getElementById("settings");
const popupStatus = document.getElementById("popup-status");
settingsButton.addEventListener("click", async () => {
  settingsButton.disabled = true;
  popupStatus.hidden = true;
  try {
    await chrome.runtime.openOptionsPage();
  } catch {
    popupStatus.textContent = "Could not open settings. Reload Word Explainer from Chrome's Extensions page and retry.";
    popupStatus.hidden = false;
  } finally {
    settingsButton.disabled = false;
  }
});
