// Independent site-level revision UI; selection popup lifecycle does not affect it.
(() => {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483646';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `<style>
    :host{all:initial}*{box-sizing:border-box}[hidden]{display:none!important}
    .review{--bg:#fff;--ink:#19332e;--muted:#61756f;--line:#e0e9e4;--green:#16654f;--soft:#f4f8f5;font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink)}
    button{font:inherit;cursor:pointer}button:focus-visible,section:focus-visible{outline:3px solid #77baa0;outline-offset:3px}
    .badge{touch-action:none;user-select:none;cursor:grab;display:flex;gap:8px;align-items:center;border:1px solid #d5e5da;border-radius:999px;padding:8px 13px;background:var(--bg);color:var(--green);box-shadow:0 3px 15px #19332e18;font-weight:650}
    .badge span{background:var(--soft);border-radius:99px;padding:1px 7px;font-size:11px}
    .badge:active{cursor:grabbing}.panel{position:fixed;right:0;top:46px;width:min(350px,calc(100vw - 32px));max-height:calc(100dvh - 86px);overflow:auto;background:var(--bg);border:1px solid var(--line);border-radius:16px;box-shadow:0 12px 36px #19332e26}
    header{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--line)}h2{font-size:14px;margin:0;flex:1}
    .close{border:0;background:transparent;color:var(--muted);font-size:22px}.intro{margin:12px 16px;color:var(--muted);font-size:11px}
    .items{max-height:min(380px,55dvh);overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;padding:0 16px}
    article{padding:12px 0;border-bottom:1px solid var(--line)}h3{margin:0 0 8px;font-size:14px;overflow-wrap:anywhere}p{margin:4px 0 10px;overflow-wrap:anywhere;white-space:pre-wrap}.label{color:var(--muted);font-size:10px;font-weight:600}
    footer{padding:12px 16px;display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:10px}.clear{border:1px solid var(--line);border-radius:8px;background:var(--soft);color:var(--ink);padding:5px 8px}.status{padding:0 16px;color:var(--muted);font-size:11px}
    @media(prefers-color-scheme:dark){.review{--bg:#18231f;--ink:#edf4ef;--muted:#a5b9ae;--line:#35463b;--green:#a4d7b8;--soft:#202f27}}
  </style><div class="review"><button class="badge" id="toggle" hidden type="button" aria-expanded="false" aria-controls="panel" title="Click to open · drag to move">✦ Review <span id="count">0</span></button><div class="panel" id="panel" hidden><header><h2>This site · Quick recap</h2><button class="close" id="close" type="button" aria-label="Close review">×</button></header><p class="intro">Up to two short sentences from each completed answer. Longer text is shortened. Concepts stay available across pages on this site.</p><section class="items" id="items" tabindex="0" aria-label="Saved concepts"></section><p class="status" id="status" role="status"></p><footer><button class="clear" id="download" type="button">Download PDF</button><button class="clear" id="clear" type="button">Clear this site’s review</button></footer></div></div>`;
  document.documentElement.appendChild(host);
  const el = id => root.getElementById(id);
  let page = pageUrl(), epoch = 0, disposed = false, items = [];
  function pageUrl() { return new URL(location.href).origin; }
  function setOpen(open) { el('panel').hidden = !open; el('toggle').setAttribute('aria-expanded', String(open)); if (open) positionPanel(); }
  let drag = null, suppressClick = false;
  const badge = el('toggle');
  const clamp = (value, max) => Math.max(8, Math.min(value, Math.max(8, max)));
  function positionPanel() {
    if (el('panel').hidden) return;
    const anchor = badge.getBoundingClientRect(), panel = el('panel'), bounds = panel.getBoundingClientRect();
    panel.style.right = 'auto';
    panel.style.left = `${clamp(anchor.right - bounds.width, innerWidth - bounds.width - 8)}px`;
    const below = anchor.bottom + 8;
    panel.style.top = `${clamp(below + bounds.height <= innerHeight - 8 ? below : anchor.top - bounds.height - 8, innerHeight - bounds.height - 8)}px`;
  }
  function moveBadge(left, top) {
    const bounds = badge.getBoundingClientRect();
    host.style.right = 'auto';
    host.style.left = `${clamp(left, innerWidth - bounds.width - 8)}px`;
    host.style.top = `${clamp(top, innerHeight - bounds.height - 8)}px`;
    positionPanel();
  }
  badge.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false) return;
    suppressClick = false;
    const bounds = badge.getBoundingClientRect();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: bounds.left, top: bounds.top, moved: false };
    badge.setPointerCapture(event.pointerId);
  });
  badge.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true; suppressClick = true;
    event.preventDefault(); moveBadge(drag.left + dx, drag.top + dy);
  });
  const endDrag = event => { if (drag?.id === event.pointerId) drag = null; };
  badge.addEventListener('pointerup', endDrag);
  badge.addEventListener('pointercancel', endDrag);
  badge.addEventListener('lostpointercapture', endDrag);
  window.addEventListener('resize', () => {
    const bounds = badge.getBoundingClientRect(); moveBadge(bounds.left, bounds.top);
  });
  async function send(type, record) {
    if (disposed) return;
    const response = await chrome.runtime.sendMessage({ type, pageUrl: page, record });
    if (!response?.ok) throw new Error(response?.error || 'Could not load page review.');
    return response.items;
  }
  function render(records) {
    items = Array.isArray(records) ? records : [];
    el('count').textContent = String(items.length);
    el('toggle').hidden = items.length === 0;
    if (!items.length) setOpen(false);
    el('toggle').setAttribute('aria-label', `Review ${items.length} concepts from this site`);
    el('items').replaceChildren();
    for (const item of items) {
      const article = document.createElement('article');
      const heading = document.createElement('h3'); heading.dir = 'auto'; heading.textContent = item.text; article.appendChild(heading);
      for (const note of item.notes || []) {
        const label = document.createElement('div'); label.className = 'label';
        label.textContent = note.action === 'translate' ? `Translation · ${note.language}` : `${note.provider === 'gemini' ? 'Gemini' : 'ChatGPT'} · Explanation`;
        const body = document.createElement('p'); body.dir = 'auto'; body.textContent = note.summary;
        article.appendChild(label); article.appendChild(body);
      }
      el('items').appendChild(article);
    }
    el('status').textContent = items.length ? '' : 'Ask an AI or translate selected text to start your recap.';
    el('clear').disabled = !items.length; el('download').disabled = !items.length; positionPanel();
  }
  async function load() {
    const current = ++epoch;
    try { const records = await send('REVIEW_LIST'); if (current === epoch && !disposed) render(records); }
    catch { if (current === epoch) el('status').textContent = 'Review is unavailable. Refresh this page after reloading the extension.'; }
  }
  function syncPage() {
    const next = pageUrl();
    if (next !== page) { page = next; setOpen(false); render([]); load(); }
  }
  let navigationTimer = setInterval(syncPage, 1000);
  window.addEventListener('pagehide', () => { disposed = true; clearInterval(navigationTimer); }, { once: true });
  window.addEventListener('pageshow', () => { if (disposed) { disposed = false; navigationTimer = setInterval(syncPage, 1000); syncPage(); load(); } });
  el('toggle').addEventListener('click', (event = {}) => { if (suppressClick && event.detail !== 0) { suppressClick = false; return; } syncPage(); setOpen(el('panel').hidden); if (!el('panel').hidden) load(); });
  el('close').addEventListener('click', () => { setOpen(false); el('toggle').focus(); });
  root.addEventListener('keydown', event => { if (event.key === 'Escape') { setOpen(false); el('toggle').focus(); } });
  el('download').addEventListener('click', async () => {
    const button=el('download');button.disabled=true;el('status').textContent='Preparing your PDF…';
    try { await send('REVIEW_EXPORT');el('status').textContent='Your PDF is being prepared in the report tab.'; }
    catch(error) { el('status').textContent=error.message||'Could not prepare the PDF. Please retry.'; }
    finally { button.disabled=!items.length; }
  });
  el('clear').addEventListener('click', async () => {
    const current = ++epoch; el('clear').disabled = true;
    try { const records = await send('REVIEW_CLEAR'); if (current === epoch) render(records); }
    catch { el('status').textContent = 'Could not clear this site’s review. Please retry.'; el('clear').disabled = !items.length; }
  });
  globalThis.WordReviewPanel = {
    async record(record) {
      syncPage(); if (disposed) return;
      try { if (new URL(record.pageUrl).origin !== page) return; } catch { return; }
      const current = ++epoch;
      try { const records = await send('REVIEW_SAVE', record); if (current === epoch && !disposed) render(records); }
      catch { if (current === epoch) el('status').textContent = 'The answer could not be saved for review. Please retry.'; }
      // Never open the panel when an answer arrives.
    }
  };
  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes.wordReviewPagesV1 && !disposed) load();
  });
  load();
})();
