// Dedicated cross-page context workspace. Saved quotations are always rendered as text.
(() => {
  const el = id => document.getElementById(id);
  let contexts = [], activeId = null, draftId = new URL(location.href).searchParams.get('draft'), draft = null;
  let summaryRequest = null, loading = false, deleteId = null;
  const completedSummaryRequests=new Set();
  const status = text => { el('status').textContent = text; };
  async function send(type, fields = {}) {
    const result = await chrome.runtime.sendMessage({ type, ...fields });
    if (result?.ok === false || result?.accepted === false || !result) throw new Error(result?.error || 'Reload the extension and reopen this screen.');
    return result;
  }
  const graph=WordContextGraph.create(el('connection-map'),{
    status,
    onLink:(contextId,from,to)=>graphMutation('CONTEXT_LINK',{contextId,from,to,note:''}),
    onMove:(contextId,quoteId,position)=>graphMutation('CONTEXT_MOVE',{contextId,quoteId,position}),
    onUnlink:(contextId,linkId)=>graphMutation('CONTEXT_UNLINK',{contextId,linkId})
  });
  async function graphMutation(type,fields){
    try{await send(type,fields);await load();status(type==='CONTEXT_MOVE'?'Card position saved.':'Connection saved.');}
    catch(error){status(error.message);}
  }
  const active = () => contexts.find(context => context.id === activeId);
  function element(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
  function quoteLink(quote, number) { const link = element('a', `[${number}] ${quote.title}`); link.href = quote.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; return link; }
  function jump(quoteId) { document.getElementById('quote-' + quoteId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('quote-' + quoteId)?.focus(); }
  function renderSummary(context) {
    const summary = context.summary;
    el('summary-section').hidden = !summary;
    el('summary').replaceChildren(); el('summary-sources').replaceChildren();
    if (!summary) return;
    el('summary-state').textContent = summary.revision === context.revision ? `Saved · ${summary.provider === 'gemini' ? 'Gemini' : 'ChatGPT'}` : 'Outdated · excerpts or links changed. Generate again.';
    // Turn only known numeric citations into navigation links; all other model output stays plain text.
    el("summary-cleanup").textContent=summary.cleanup?.warning||(summary.cleanup?.state==="deleted"?"Generated AI chat removed from history.":"");
    const text = summary.text; let cursor = 0;
    for (const match of text.matchAll(/\[(\d+)\]/g)) {
      el('summary').appendChild(document.createTextNode(text.slice(cursor, match.index)));
      const source = summary.sources.find(source => source.number === Number(match[1]));
      if (source) { const link = element('a', match[0]); link.href = '#quote-' + source.id; link.addEventListener('click', () => jump(source.id)); el('summary').appendChild(link); }
      else el('summary').appendChild(document.createTextNode(match[0]));
      cursor = match.index + match[0].length;
    }
    el('summary').appendChild(document.createTextNode(text.slice(cursor)));
    for (const source of summary.sources) el('summary-sources').appendChild(quoteLink(source, source.number));
  }
  function render() {
    el('context-list').replaceChildren();
    for (const context of contexts) {
      const button = element('button', `${context.name} · ${context.quotes.length}`); button.type = 'button'; button.setAttribute('aria-current', String(context.id === activeId));
      button.addEventListener('click', () => { activeId = context.id; status(''); render(); });
      const row=element('div',undefined,'context-list-row');row.appendChild(button);
      const trash=element('button','🗑','context-delete');trash.type='button';trash.setAttribute('aria-label',`Delete context ${context.name}`);trash.title='Delete context';
      trash.addEventListener('click',()=>{deleteId=context.id;el('delete-context-name').textContent=context.name;el('delete-confirmation').value='';el('delete-error').textContent='';el('delete-dialog').showModal();el('delete-confirmation').focus();});
      row.appendChild(trash);el('context-list').appendChild(row);
    }
    const context = active();
    el('empty').hidden = !!context; el('context').hidden = !context;
    el('capture').hidden = !draft; el('save-draft').disabled = !context || !draft;
    if (draft) { el('draft-text').textContent = draft.text; el('draft-source').textContent = draft.title || draft.url; }
    if (!context) return;
    el('context-name').textContent = context.name;
    el('context-meta').textContent = `${context.quotes.length} excerpts · ${new Set(context.quotes.map(quote => quote.url)).size} pages · ${context.links.length} explicit links`;
    el('summarize').disabled = !!summaryRequest || context.quotes.length < 2;
    el('quotes').replaceChildren();
    context.quotes.forEach((quote, index) => {
      const article = element('article', undefined, 'quote'); article.id = 'quote-' + quote.id; article.tabIndex = -1;
      const row = element('div', undefined, 'row'); row.appendChild(quoteLink(quote, index + 1));
      const remove = element('button', 'Remove', 'secondary small'); remove.type = 'button'; remove.addEventListener('click', () => mutate('CONTEXT_REMOVE', { quoteId: quote.id })); row.appendChild(remove);
      const body = element('p', quote.text); body.dir = 'auto'; article.appendChild(row); article.appendChild(body);
      article.appendChild(element('div', new Date(quote.createdAt).toLocaleString(), 'hint')); el('quotes').appendChild(article);
    });
    el('link-section').hidden = context.quotes.length < 2; el('links').replaceChildren();
    for (const link of context.links) {
      const from = context.quotes.findIndex(q => q.id === link.from), to = context.quotes.findIndex(q => q.id === link.to);
      const row = element('div', undefined, 'link');
      const fromLink = element('a', `[${from + 1}]`); fromLink.href = '#quote-' + link.from;
      const toLink = element('a', `[${to + 1}]`); toLink.href = '#quote-' + link.to;
      row.appendChild(fromLink); row.appendChild(document.createTextNode(' → ')); row.appendChild(toLink); row.appendChild(element('p', link.note || 'Linked by you'));
      const remove = element('button', 'Remove link', 'secondary small'); remove.type = 'button'; remove.addEventListener('click', () => mutate('CONTEXT_UNLINK', { linkId: link.id })); row.appendChild(remove); el('links').appendChild(row);
    }
    el('connection-map-section').hidden=context.quotes.length===0;
    graph.render(context);
    renderSummary(context);
  }
  async function load() {
    const data = await send('CONTEXT_LIST'); contexts = data.contexts;
    if (!active()) activeId = contexts[0]?.id || null;
    if(data.activeJob?.requestId&&!completedSummaryRequests.has(data.activeJob.requestId))summaryRequest=data.activeJob.requestId;
    else if(completedSummaryRequests.has(summaryRequest))summaryRequest=null;
    render();
  }
  async function mutate(type, fields = {}) {
    if (loading || !active()) return;
    loading = true;
    try { await send(type, { contextId: activeId, ...fields }); await load(); status('Saved on this device.'); }
    catch (error) { status(error.message); }
    finally { loading = false; }
  }
  el('delete-cancel').addEventListener('click',()=>el('delete-dialog').close());
  el('delete-dialog').addEventListener('close',()=>{deleteId=null;});
  el('delete-form').addEventListener('submit',async event=>{
    event.preventDefault();if(loading||!deleteId)return;
    const target=contexts.find(context=>context.id===deleteId);
    if(!target||el('delete-confirmation').value!==target.name){el('delete-error').textContent='The name does not match. Type the exact context name.';return;}
    loading=true;el('delete-confirm').disabled=true;el('delete-error').textContent='';
    try{await send('CONTEXT_DELETE',{contextId:target.id,confirmation:el('delete-confirmation').value});
      if(activeId===target.id)activeId=null;
      el('delete-dialog').close();await load();status('Context deleted.');
    }catch(error){el('delete-error').textContent=error.message;}
    finally{loading=false;el('delete-confirm').disabled=false;}
  });
  el('create-form').addEventListener('submit', async event => {
    event.preventDefault(); if (loading) return; loading = true;
    try { const data = await send('CONTEXT_CREATE', { name: el('name').value, draftId:draft?draftId:undefined }); activeId = data.context.id; el('name').value = ''; if(data.captured){draft=null;history.replaceState(null,'',location.pathname);} await load(); status(data.captured?'Context created with your first excerpt.':'Context created.'); }
    catch (error) { status(error.message); } finally { loading = false; }
  });
  el('save-draft').addEventListener('click', async () => {
    if (!draft || !active() || loading) return; loading = true;
    try { await send('CONTEXT_ADD', { contextId: activeId, draftId }); draft = null; history.replaceState(null, '', location.pathname); await load(); status('Excerpt added. It is linked to the other sources through this context.'); }
    catch (error) { status(error.message); } finally { loading = false; }
  });
  el('discard-draft').addEventListener('click', () => { draft = null; history.replaceState(null, '', location.pathname); render(); });
  el('summarize').addEventListener('click', async () => {
    const context = active(); if (!context || summaryRequest) return;
    summaryRequest = crypto.randomUUID(); render(); status('Opening the selected AI provider…');
    try { await send('CONTEXT_SUMMARIZE', { contextId: context.id, provider: el('provider').value, requestId: summaryRequest }); }
    catch (error) { summaryRequest = null; status(error.message); render(); }
  });
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (sender.id !== chrome.runtime.id || !message.type?.startsWith('CONTEXT_SUMMARY_')) return;
    if (message.requestId !== summaryRequest) return;
    if (message.type === 'CONTEXT_SUMMARY_RESULT') {
      completedSummaryRequests.add(message.requestId);if(completedSummaryRequests.size>30)completedSummaryRequests.delete(completedSummaryRequests.values().next().value);
      summaryRequest = null; load().then(() => status(message.ok ? (message.warning || 'Summary saved. Follow the numbered source links to inspect the evidence.') : message.error)).catch(error => status(error.message));
    } else if (message.contextId === activeId) status(message.stage || 'Receiving the combined summary…');
  });
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.wordContextsV1) load().catch(error => status(error.message)); });
  (async () => {
    if (draftId) { const data = await send('CONTEXT_DRAFT', { draftId }); draft = data.draft; if (!draft) status('The selection expired. Select it again on the source page.'); }
    await load();
  })().catch(error => status(error.message));
})();
