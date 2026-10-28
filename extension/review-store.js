// Local-only page revision storage. No model calls, cookies, or browsing history.
(() => {
  const KEY = 'wordReviewPagesV1';
  const MAX_PAGES = 20, MAX_CONCEPTS = 40;
  function pageKey(value) {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Review is available on web pages only.');
    url.hash = '';
    return url.href;
  }
  function excerpt(value) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    const sentences = text.match(/[^.!?۔！？]+[.!?۔！？]+(?:\s|$)|[^.!?۔！？]+$/gu) || [text];
    const short = sentences.slice(0, 2).join(' ').replace(/\s+/g, ' ').trim();
    return short.length > 240 ? short.slice(0, 237).trimEnd() + '…' : short;
  }
  function create(storage) {
    let queue = Promise.resolve();
    const run = task => { const result = queue.then(task); queue = result.catch(() => {}); return result; };
    async function read() {
      const value = (await storage.get(KEY))[KEY];
      return Array.isArray(value) ? value.filter(page => typeof page?.url === 'string' && Array.isArray(page.items)).slice(0, MAX_PAGES) : [];
    }
    return {
      list(url) { return run(async () => (await read()).find(page => page.url === pageKey(url))?.items || []); },
      save(url, record) { return run(async () => {
        const pageUrl = pageKey(url);
        const text = typeof record?.text === 'string' ? record.text.trim().slice(0, 1000) : '';
        if (!text || !['explain', 'translate'].includes(record.action) || typeof record.answer !== 'string' || !record.answer.trim())
          throw new Error('A completed answer is required for review.');
        const pages = await read();
        let page = pages.find(page => page.url === pageUrl) || { url: pageUrl, items: [] };
        let item = page.items.find(item => item.text === text);
        if (!item) { item = { text, notes: [] }; page.items.push(item); }
        const provider = record.action === 'translate' ? 'google' : record.provider === 'gemini' ? 'gemini' : 'chatgpt';
        const language = record.action === 'translate' ? String(record.language || 'Urdu').slice(0, 30) : '';
        const note = { action: record.action, provider, language, summary: excerpt(record.answer), updatedAt: Date.now() };
        item.notes = (Array.isArray(item.notes) ? item.notes : []).filter(n => !(n.action === note.action && n.provider === provider && n.language === language));
        item.notes.push(note); item.notes = item.notes.slice(-8); item.updatedAt = note.updatedAt;
        page.items = [...page.items.filter(other => other !== item), item].slice(-MAX_CONCEPTS);
        const next = pages.filter(other => other.url !== pageUrl); next.push(page);
        await storage.set({ [KEY]: next.slice(-MAX_PAGES) });
        return page.items;
      }); },
      clear(url) { return run(async () => {
        const key = pageKey(url); await storage.set({ [KEY]: (await read()).filter(page => page.url !== key) }); return [];
      }); }
    };
  }
  globalThis.WordReviewStore = { create, pageKey, excerpt };
})();
