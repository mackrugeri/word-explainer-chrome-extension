(() => {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;z-index:2147483647;display:none";
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `
    <style>
      .toolbar { display:flex;gap:6px;padding:8px;background:#fff;border:1px solid #ddd;
        border-radius:10px;box-shadow:0 4px 18px #0003;font:13px system-ui; }
      button { border:0;border-radius:6px;padding:8px;color:#fff;background:#2456cf;cursor:pointer; }
      button:hover { background:#173e9c; }
    </style>
    <div class="toolbar" role="toolbar" aria-label="Selected text actions">
      <button id="speak" type="button">Pronounce</button>
      <button id="explain" type="button">Explain in ChatGPT</button>
      <button id="close" type="button" aria-label="Close">×</button>
    </div>`;
  document.documentElement.appendChild(host);
  let settings = { language: "en-US", rate: 1, showToolbar: true };
  chrome.storage.local.get(settings).then((stored) => { settings = stored; }).catch(() => {});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const key of Object.keys(settings)) {
      if (changes[key]) settings[key] = changes[key].newValue;
    }
    if (!settings.showToolbar) hide();
  });
  let selectedText = "";
  const hide = () => { host.style.display = "none"; };

  function showSelection() {
    if (!settings.showToolbar) { hide(); return; }
    const active = document.activeElement;
    if (active?.matches("input, textarea, [contenteditable]:not([contenteditable='false'])")) {
      hide();
      return;
    }
    const selection = window.getSelection();
    selectedText = String(selection || "").trim().slice(0, 1000);
    if (!selectedText || !selection.rangeCount) { hide(); return; }
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    host.style.display = "block";
    const width = host.getBoundingClientRect().width;
    const height = host.getBoundingClientRect().height;
    host.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - width - 8))}px`;
    host.style.top = `${Math.max(8, Math.min(rect.bottom + 8, innerHeight - height - 8))}px`;
  }

  document.addEventListener("mouseup", (event) => {
    if (!event.composedPath().includes(host)) showSelection();
  });
  document.addEventListener("keyup", (event) => {
    if (event.key === "Escape") hide();
    else if (event.key === "Shift") showSelection();
  });
  document.addEventListener("scroll", hide, true);
  window.addEventListener("resize", hide);
  root.addEventListener("mousedown", (event) => event.preventDefault());
  root.getElementById("speak").addEventListener("click", () => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(selectedText);
    utterance.lang = settings.language;
    utterance.rate = settings.rate;
    speechSynthesis.speak(utterance);
  });
  root.getElementById("explain").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "EXPLAIN_SELECTION", text: selectedText });
    hide();
  });
  root.getElementById("close").addEventListener("click", hide);
})();
