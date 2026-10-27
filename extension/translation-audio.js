// Plays translation audio in an extension document, independent of page CSP.
let playback = null;
function stopPlayback() {
  if (!playback) return;
  const old = playback; playback = null;
  old.controller?.abort(); old.audio?.pause(); old.cancel?.();
  if (old.url) URL.revokeObjectURL(old.url);
}
function chunks(text, limit = 180) {
  const output = []; let current = "";
  for (const word of text.match(/\S+\s*/gu) || []) {
    const characters = Array.from(word);
    if (characters.length > limit) {
      if (current.trim()) output.push(current.trim()); current = "";
      while (characters.length) output.push(characters.splice(0, limit).join(""));
    } else if (Array.from(current + word).length > limit) {
      if (current.trim()) output.push(current.trim()); current = word;
    } else current += word;
  }
  if (current.trim()) output.push(current.trim());
  return output;
}
async function report(job, state, error) {
  try { await chrome.runtime.sendMessage({ type: "TRANSLATION_AUDIO_STATUS", sourceTabId: job.sourceTabId,
    speechId: job.speechId, state, error }); } catch { stopPlayback(); }
}
async function play(job) {
  stopPlayback();
  const task = { ...job, controller: null, audio: null, url: null, cancel: null };
  playback = task;
  try {
    for (const part of chunks(job.text)) {
      if (playback !== task) return;
      task.controller = new AbortController();
      const timeout = setTimeout(() => task.controller.abort(), 15000);
      let blob;
      try {
        const query = new URLSearchParams({ ie: "UTF-8", client: "tw-ob", tl: job.language, q: part });
        const response = await fetch(`https://translate.google.com/translate_tts?${query}`, {
          signal: task.controller.signal, credentials: "omit", redirect: "error"
        });
        if (!response.ok || !response.headers.get("content-type")?.startsWith("audio/"))
          throw new Error("Google could not provide translation audio. Please retry.");
        blob = await response.blob();
      } finally { clearTimeout(timeout); }
      if (playback !== task) return;
      task.url = URL.createObjectURL(blob);
      task.audio = new Audio(task.url); task.audio.playbackRate = job.rate;
      await new Promise((resolve, reject) => {
        task.cancel = resolve;
        task.audio.onended = resolve;
        task.audio.onerror = () => reject(new Error("Translation audio could not play."));
        task.audio.play().then(() => report(job, "playing"), reject);
      });
      URL.revokeObjectURL(task.url); task.url = null;
    }
    if (playback === task) { playback = null; await report(job, "finished"); }
  } catch (error) {
    if (playback === task) { stopPlayback(); await report(job, "error", error.name === "AbortError" ? "Audio request timed out. Please retry." : error.message); }
  }
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || sender.tab || message.target !== "translation-audio") return;
  if (message.type === "STOP_TRANSLATION_AUDIO") { stopPlayback(); sendResponse({ accepted: true }); return; }
  if (message.type !== "PLAY_TRANSLATION_AUDIO") return;
  if (typeof message.text !== "string" || !message.text.trim() || message.text.length > 5000 ||
      !["ur", "en", "ar", "fr", "es"].includes(message.language)) {
    sendResponse({ accepted: false }); return;
  }
  sendResponse({ accepted: true });
  play({ text: message.text, language: message.language, speechId: message.speechId,
    sourceTabId: message.sourceTabId, rate: Math.max(.5, Math.min(2, Number(message.rate) || 1)) });
});
window.addEventListener("pagehide", stopPlayback);
