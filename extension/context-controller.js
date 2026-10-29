// Narrow message boundary: source pages can capture a selection; only our UI manages contexts.
(() => {
  function create({ chrome, store, startJob, readJob }) {
    let captureQueue = Promise.resolve();
    const trustedUI = sender => sender.url?.split(/[?#]/)[0] === chrome.runtime.getURL('contexts.html');
    function handle(message, sender, reply) {
      if (message.type === 'OPEN_CONTEXTS') {
        if (!sender.tab && !sender.url?.startsWith(chrome.runtime.getURL(''))) return;
        captureQueue = captureQueue.catch(() => {}).then(async () => {
          let suffix = '';
          if (message.text !== undefined) {
            if (!sender.tab || typeof message.text !== 'string' || !message.text.trim() || message.text.length > 8000) throw new Error('Select up to 8,000 characters.');
            const url = WordContextStore.sourceUrl(sender.tab.url || sender.url);
            const draftId = crypto.randomUUID();
            const drafts = (await chrome.storage.session.get('contextDraftsV1')).contextDraftsV1 || {};
            const fresh = Object.entries(drafts).filter(([, value]) => value.createdAt > Date.now() - 3600000).slice(-19);
            const record = { text: message.text.trim(), url, title: String(message.title || '').slice(0, 300), createdAt: Date.now() };
            await chrome.storage.session.set({ contextDraftsV1: { ...Object.fromEntries(fresh), [draftId]: record } });
            suffix = '?draft=' + encodeURIComponent(draftId);
          }
          await chrome.tabs.create({ url: chrome.runtime.getURL('contexts.html') + suffix, active: true });
          reply({ ok: true });
        }).catch(error => reply({ ok: false, error: error.message }));
        return true;
      }
      if (!message.type?.startsWith('CONTEXT_')) return;
      if (!trustedUI(sender)) { reply({ ok: false, error: 'Open the Cross-page contexts screen to manage research.' }); return; }
      if (message.type === 'CONTEXT_SUMMARIZE') {
        if (!sender.tab || !['chatgpt', 'gemini'].includes(message.provider) || typeof message.requestId !== 'string') { reply({ accepted: false, error: 'Choose an AI provider.' }); return; }
        reply({ accepted: true });
        (async () => {
          const prepared = await store.prepare(message.contextId);
          await startJob(prepared.prompt, sender.tab.id, message.requestId, message.provider, { task: 'context-summary', contextId: prepared.contextId, revision: prepared.revision, sources: prepared.sources });
        })().catch(error => chrome.runtime.sendMessage({ type: 'CONTEXT_SUMMARY_RESULT', contextId: message.contextId, requestId: message.requestId, ok: false, error: error.message }).catch(() => {}));
        return;
      }
      (async () => {
        switch (message.type) {
          case 'CONTEXT_LIST': {
            const job = await readJob();
            return { contexts: await store.list(), activeJob: job?.task === 'context-summary' ? { contextId: job.contextId, requestId: job.requestId } : null };
          }
          case 'CONTEXT_CREATE': return { context: await store.create(message.name) };
          case 'CONTEXT_DRAFT': {
            const drafts = (await chrome.storage.session.get('contextDraftsV1')).contextDraftsV1 || {};
            return { draft: drafts[message.draftId]?.createdAt > Date.now() - 3600000 ? drafts[message.draftId] : null };
          }
          case 'CONTEXT_ADD': {
            const drafts = (await chrome.storage.session.get('contextDraftsV1')).contextDraftsV1 || {};
            const draft = drafts[message.draftId];
            if (!draft || draft.createdAt < Date.now() - 3600000) throw new Error('This selection expired. Select the paragraph again.');
            return { context: await store.add(message.contextId, draft) };
          }
          case 'CONTEXT_REMOVE': return { context: await store.remove(message.contextId, message.quoteId) };
          case 'CONTEXT_LINK': return { context: await store.link(message.contextId, message.from, message.to, message.note) };
          case 'CONTEXT_UNLINK': return { context: await store.unlink(message.contextId, message.linkId) };
          default: throw new Error('Unsupported context action.');
        }
      })().then(result => reply({ ok: true, ...result }), error => reply({ ok: false, error: error.message }));
      return true;
    }
    return { handle };
  }
  globalThis.WordContextController = { create };
})();
