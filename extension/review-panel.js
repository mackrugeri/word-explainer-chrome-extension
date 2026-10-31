// Independent site-level revision UI; selection popup lifecycle does not affect it.
(() => {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483646';
  globalThis.WordTheme?.register(host);
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `<style>
:host{all:initial}*{box-sizing:border-box}[hidden]{display:none!important}.review{--bg:#fff;--ink:#222e27;--muted:#647268;--line:#dce3dc;--green:#245d47;--soft:#f3f6f1;--danger:#a2352d;font:13px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);color-scheme:light;-webkit-font-smoothing:antialiased}:host([data-we-theme="dark"]) .review{--bg:#1d2720;--ink:#ecf0ea;--muted:#adbaaf;--line:#38473b;--green:#b3d8bf;--soft:#26332a;--danger:#f1a79d;color-scheme:dark}button{font:inherit;cursor:pointer}button:disabled{opacity:.5;cursor:wait}button:focus-visible,section:focus-visible,a:focus-visible{outline:3px solid #6ba788;outline-offset:3px}.badge{touch-action:none;user-select:none;cursor:grab;display:flex;gap:8px;align-items:center;border:1px solid var(--line);border-radius:9px;padding:8px 12px;background:var(--bg);color:var(--green);box-shadow:0 3px 12px #15271b17;font-size:12px;font-weight:600}.badge .we-button-icon{margin:0}.badge span{display:grid;place-items:center;background:var(--soft);border-radius:5px;min-width:21px;padding:1px 5px;font-size:10px}.badge:active{cursor:grabbing}.panel{position:fixed;right:0;top:46px;display:flex;flex-direction:column;width:min(400px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:hidden;background:var(--soft);border:1px solid var(--line);border-radius:13px;box-shadow:0 16px 40px #15271b24,0 2px 8px #15271b0d}header{display:flex;align-items:center;gap:10px;padding:17px 18px;background:var(--bg);border-bottom:1px solid var(--line);flex:none}.review-heading{flex:1;min-width:0}h2{font-size:17px;font-weight:650;line-height:1.3;letter-spacing:-.3px;margin:0}.site{font-size:11px;line-height:1.4;color:var(--muted);margin:4px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.total{font-size:10px;color:var(--green);background:var(--soft);border:1px solid var(--line);border-radius:6px;padding:3px 6px;white-space:nowrap}.close{display:grid;place-items:center;flex:none;width:32px;height:32px;padding:0;border:0;border-radius:7px;background:transparent;color:var(--muted);font-size:23px}.close:hover{background:var(--soft);color:var(--ink)}.items{min-height:0;max-height:min(460px,65dvh);overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;padding:14px 16px;outline-offset:-4px}article{padding:15px;background:var(--bg);border:1px solid var(--line);border-radius:10px;margin:0 0 12px}article:last-child{margin-bottom:0}h3{margin:0;font-size:16px;line-height:1.45;font-weight:600;letter-spacing:-.1px;overflow-wrap:anywhere}.review-note{padding-top:12px;margin-top:12px;border-top:1px solid var(--line)}.label{display:inline-flex;align-items:center;padding:2px 7px;border:1px solid var(--line);border-radius:5px;background:var(--soft);color:var(--muted);font-size:10px;font-weight:550;line-height:1.6}.label[data-kind="personal"]{color:var(--green)}.note-body{margin:8px 0 0;font-size:14px;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere}.note-body:dir(rtl){font-family:"Noto Naskh Arabic","Geeza Pro",serif;font-size:17px;line-height:1.9}footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;background:var(--bg);border-top:1px solid var(--line);flex:none}.clear{display:inline-flex;align-items:center;justify-content:center;min-height:35px;padding:7px 10px;border:1px solid var(--line);border-radius:7px;background:var(--bg);color:var(--ink);font-size:11px;font-weight:550}#download{color:var(--green)}#download:hover{background:var(--soft);border-color:var(--green)}#clear{border-color:transparent;color:var(--danger);font-weight:500}#clear:hover{border-color:var(--line);background:var(--soft)}.status{margin:0;padding:0 16px 12px;color:var(--muted);font-size:11px;white-space:pre-wrap;overflow-wrap:anywhere}.status:empty{display:none}@media(max-width:350px){header{padding:14px}.items{padding:11px}article{padding:12px}footer{padding:10px 11px;gap:6px}.total{font-size:9px}h3{font-size:15px}.note-body{font-size:13px}}@media(pointer:coarse){.close,.clear{min-height:44px}.close{width:38px}}
  </style><div class="review"><button class="badge" id="toggle" hidden type="button" aria-expanded="false" aria-controls="panel" title="Click to open · drag to move">Review <span id="count">0</span></button><div class="panel" id="panel" role="dialog" aria-labelledby="review-title" hidden><header><div class="review-heading"><h2 id="review-title">Site review</h2><p id="review-site" class="site"></p></div><span id="review-total" class="total"></span><button class="close" id="close" type="button" aria-label="Close review">×</button></header><section class="items" id="items" tabindex="0" aria-label="Saved concepts"></section><p class="status" id="status" role="status"></p><footer><button class="clear" id="download" type="button">Download PDF</button><button class="clear" id="clear" type="button">Clear AI recap</button></footer></div></div>`;
  globalThis.WordUIIcons?.decorate(root);
  document.documentElement.appendChild(host);
  const el = id => root.getElementById(id);
  let page = pageUrl(), epoch = 0, disposed = false, items = [];
  function pageUrl() { return new URL(location.href).origin; }
  function setOpen(open) { el('panel').hidden = !open; el('toggle').setAttribute('aria-expanded', String(open)); if (open) { positionPanel(); el('close').focus?.({preventScroll:true}); } }
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
    el('review-site').textContent = new URL(page).hostname;
    el('review-total').textContent = `${items.length} ${items.length===1?'term':'terms'}`;
    el('toggle').hidden = items.length === 0;
    if (!items.length) setOpen(false);
    el('toggle').setAttribute('aria-label', `Review ${items.length} concepts from this site`);
    el('items').replaceChildren();
    for (const item of items) {
      const article = document.createElement('article');
      const heading = document.createElement('h3'); heading.dir = 'auto'; heading.textContent = item.text; article.appendChild(heading);
      for (const note of item.notes || []) {
        const noteBox=document.createElement('div');noteBox.className='review-note';
        const label = document.createElement('div'); label.className = 'label';label.setAttribute('data-kind',note.action==='personal'?'personal':note.action==='translate'?'translate':'explain');
        label.textContent = note.action === 'personal' ? 'Personal note' : note.action === 'translate' ? `Translation · ${note.language}` : `${note.provider === 'gemini' ? 'Gemini' : 'ChatGPT'} · Explanation`;
        const body = document.createElement('p'); body.className='note-body';body.dir = 'auto'; body.textContent = note.summary;
        noteBox.appendChild(label);noteBox.appendChild(body);article.appendChild(noteBox);
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
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!el('panel').hidden){event.stopPropagation();setOpen(false);el('toggle').focus();}});
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
    if (area === 'local' && (changes.wordReviewPagesV1 || changes.wordPersonalNotesV1) && !disposed) load();
  });
  load();
})();
