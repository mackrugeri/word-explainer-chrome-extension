(() => {
  const el=id=>document.getElementById(id);
  const labels={review:'Review summaries',notes:'Personal notes',highlights:'Text highlights'};
  let busy=false;
  const size=value=>value<1024?`${value} B`:value<1048576?`${(value/1024).toFixed(1)} KB`:`${(value/1048576).toFixed(2)} MB`;
  function node(tag,text,className){const item=document.createElement(tag);if(text!==undefined)item.textContent=text;if(className)item.className=className;return item;}
  function setBusy(value){busy=value;for(const button of document.querySelectorAll('.storage-section button'))button.disabled=value;}
  async function request(message){const result=await chrome.runtime.sendMessage(message);if(!result?.ok)throw Error(result?.error||'Storage management is unavailable. Reload the extension and reopen Settings.');return result.report;}
  function render(report){
    el('storage-total').textContent=`${size(report.totalBytes)} saved locally · ${size(report.quotaBytes)} local storage limit`;
    el('storage-meter').value=Math.min(100,100*report.totalBytes/report.quotaBytes);
    el('storage-sites').replaceChildren();
    for(const site of report.sites){
      const card=node('article',undefined,'storage-site'),heading=node('div',undefined,'storage-heading');
      heading.append(node('h3',site.origin));
      const removable=Object.keys(labels).filter(category=>site[category].bytes>0);
      if(removable.length){const clear=node('button','Remove site data','secondary');clear.type='button';clear.addEventListener('click',()=>remove(site.origin,'all'));heading.append(clear);}
      card.append(heading);
      for(const [category,label]of Object.entries(labels)){
        const entry=site[category];if(!entry.bytes&&!entry.count)continue;
        const row=node('div',undefined,'storage-category'),info=node('div');
        info.append(node('strong',label),node('small',`${entry.count} saved · about ${size(entry.bytes)}`));
        const button=node('button','Remove','storage-remove');button.type='button';button.setAttribute('aria-label',`Remove ${label.toLowerCase()} for ${site.origin}`);button.addEventListener('click',()=>remove(site.origin,category));row.append(info,button);card.append(row);
        if(entry.examples.length){const details=node('details',undefined,'storage-preview');details.append(node('summary','Preview saved text'));const list=node('ul');for(const text of entry.examples){const item=node('li',text);item.dir='auto';list.append(item);}details.append(list);card.append(details);}
      }
      if(site.contextQuotes)card.append(node('p',`${site.contextQuotes} excerpts in shared research contexts · managed separately`,'field-note'));
      el('storage-sites').append(card);
    }
    if(!report.sites.length)el('storage-sites').append(node('p','No website highlights, notes or Review summaries are saved.','field-note'));
    el('storage-context-count').textContent=`(${report.contexts.length})`;
    el('storage-contexts').replaceChildren();for(const context of report.contexts)el('storage-contexts').append(node('li',`${context.name} · ${context.quotes} excerpts · about ${size(context.bytes)}`));
    el('storage-settings').textContent=`${report.preferences.count} saved preferences · about ${size(report.preferences.bytes)}. Language, voice speed, text size and explanation preferences are kept. Change them with Save settings above.`;
    el('storage-other').replaceChildren();for(const item of report.others)el('storage-other').append(node('li',`${item.key} · about ${size(item.bytes)} · managed data, kept for compatibility`));
    if(!report.others.length)el('storage-other').append(node('li','No additional local data.'));
  }
  async function refresh(){if(busy)return;setBusy(true);try{render(await request({type:'STORAGE_INSPECT'}));el('storage-status').textContent='Storage list is up to date.';}catch(error){el('storage-status').textContent=error.message;}finally{setBusy(false);}}
  async function remove(site,category){
    if(busy)return;
    const what=category==='all'?'all highlights, personal notes and Review summaries':labels[category].toLowerCase();
    if(!confirm(`Remove ${what} for ${site}? This cannot be undone. Settings and shared research contexts will be kept.`))return;
    setBusy(true);el('storage-status').textContent='Removing saved data…';
    try{render(await request({type:'STORAGE_CLEAR_SITE',site,category}));el('storage-status').textContent=`Removed ${what} for ${site}. Settings and shared contexts were kept.`;}
    catch(error){el('storage-status').textContent=`${error.message} Refresh the list to check what is still saved.`;}
    finally{setBusy(false);}
  }
  el('storage-refresh').addEventListener('click',refresh);
  refresh();
})();
