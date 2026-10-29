// UI automation only; never reads account cookies or existing user conversations.
(() => {
  const BUILD = "0.2.6";
  let busy = false;
  let cleanupEligible = false;
  let ownedPrompt = "";
  let stage = "Connecting to Gemini…";
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  let disposed = false;
  let heartbeat = null;
  const dispose = () => { disposed = true; clearInterval(heartbeat); heartbeat = null; };
  async function emit(message) {
    if (disposed) return;
    try {
      if (!chrome.runtime?.id) { dispose(); return; }
      return await chrome.runtime.sendMessage(message);
    } catch (error) {
      // sendMessage can throw synchronously after an extension reload.
      if (/context invalidated|extension context/i.test(error?.message || "")) dispose();
      return undefined;
    }
  }
  if (typeof window !== "undefined") window.addEventListener("pagehide", dispose, { once: true });
  const progress = text => { stage = text; emit({ type: "GEMINI_PROGRESS", stage }); };
  async function until(read, timeout, error) {
    const end = Date.now() + timeout;
    while (Date.now() < end) { if (disposed) throw new Error("Extension updated. Refresh the page."); const value = read(); if (value) return value; await pause(400); }
    throw new Error(error);
  }
  function assistantBodies() {
    return [...document.querySelectorAll('model-response message-content, model-response .markdown, .model-response-text')];
  }
  const stopButton = () => document.querySelector('button[aria-label="Stop response"], button[aria-label="Stop generating"], button[aria-label="Stop"]');
  const sendButton = () => document.querySelector('button[aria-label="Send message"], button[aria-label="Send"]');
  async function readAnswer(limit = 2000) {
    let previous = "", stableSince = Date.now();
    return until(() => {
      // Guest layouts can leave an empty trailing assistant placeholder.
      const text = assistantBodies().map(node => (node.innerText || node.textContent || "").trim())
        .filter(Boolean).at(-1) || "";
      if (/^(this response couldn.t load|something went wrong|unable to load)/i.test(text))
        throw new Error("Gemini could not load its response. Check Gemini directly, then retry.");
      if (text !== previous) {
        previous = text; stableSince = Date.now();
        if (text) { progress("Receiving the explanation…"); emit({ type: "GEMINI_PARTIAL", text }); }
      }
      if (text && !stopButton() && Date.now() - stableSince >= 2500) return text.slice(0, limit);
      return null;
    }, 60000, "No readable answer arrived. Gemini may need sign-in, verification, or a foreground tab.");
  }
  async function prepareAndSend(prompt) {
    if (!/^\/app\/?$/.test(location.pathname)) throw new Error("A fresh Gemini page is required; existing chats will not be modified.");
    progress("Waiting for Gemini's editor…");
    const editor = await until(() => document.querySelector('[contenteditable="true"][role="textbox"], .ql-editor[contenteditable="true"], textarea[aria-label="Enter a prompt for Gemini"]'),
      30000, "Gemini's editor is unavailable. Open Gemini and check sign-in or verification, then retry.");
    if (assistantBodies().length || document.querySelector('user-query'))
      throw new Error("This page contains an existing conversation; it will not be changed.");
    if ((editor.innerText || editor.value || "").trim()) throw new Error("Gemini's editor is not empty; it will not be overwritten.");
    progress("Writing the question…"); editor.focus();
    if (editor instanceof HTMLTextAreaElement) {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(editor, prompt);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      const range = document.createRange(); range.selectNodeContents(editor);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      if (!document.execCommand("insertText", false, prompt)) throw new Error("The Gemini editor changed. Automatic entry needs an update.");
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: prompt }));
    }
    progress("Waiting for the send button…");
    const send = await until(() => {
      const button = sendButton();
      return button && !button.disabled && button.getAttribute("aria-disabled") !== "true" ? button : null;
    }, 10000, "Gemini cannot send. Check sign-in, limits, or website changes.");
    // Persist before the click; a replacement document resumes reading, never resends.
    const ack = await emit({ type: "GEMINI_PHASE", phase: "submitted" });
    if (!ack?.ok) throw new Error("The request was cancelled. Please retry.");
    send.click(); progress("Question sent · waiting for the answer…");
  }
  function launch(prompt, resume = false, task = "explain", expectedPrompt = "") {
    if (busy || disposed) return;
    busy = true;
    ownedPrompt = resume ? expectedPrompt : prompt;
    heartbeat = setInterval(() => progress(stage), 4000);
    (async () => {
      try {
        if (!resume) await prepareAndSend(prompt);
        else progress("Reconnected · reading Gemini's answer…");
        cleanupEligible = true;
        const text = await readAnswer(task === "context-summary" ? 12000 : 2000);
        await emit({ type: "GEMINI_RESULT", ok: true, text, cleanupPath: cleanupEligible ? location.pathname : undefined });
      } catch (error) { await emit({ type: "GEMINI_RESULT", ok: false, error: error.message }); }
      finally { clearInterval(heartbeat); heartbeat = null; busy = false; }
    })();
  }
  const onMessage = (message, sender, sendResponse) => {
    try {
      if (disposed || !chrome.runtime?.id || sender.id !== chrome.runtime.id) return;
    } catch { dispose(); return; }
    if (message.type === "GEMINI_CLEANUP") {
      if (!cleanupEligible || !globalThis.WordChatCleanup?.validPath(message.path)) { sendResponse({deleted:false}); return; }
      cleanupEligible = false;
      WordChatCleanup.remove(message.path,message.expectedPrompt||ownedPrompt).then(sendResponse,()=>sendResponse({deleted:false,error:"Chat cleanup failed."}));
      return true;
    }
    if (message.type === "GEMINI_READY") { sendResponse({ ready: true, build: BUILD }); return; }
    if (message.type === "GEMINI_START") {
      if (busy || typeof message.prompt !== "string" || message.prompt.length > (message.task === "context-summary" ? 28000 : 2500)) {
        sendResponse({ accepted: false, error: "Gemini is already handling a request or the prompt is invalid." }); return;
      }
      sendResponse({ accepted: true }); // Synchronous acknowledgement, not the answer.
      launch(message.prompt, false, message.task);
    }
  };
  try { chrome.runtime.onMessage.addListener(onMessage); }
  catch { dispose(); return; }
  emit({ type: "GEMINI_RESUME" }).then((response) => {
    const job = response?.job;
    if (job?.phase === "submitted" && !busy && !disposed) launch(null, true, job.task, job.expectedPrompt);
  }).catch(() => {});
})();
