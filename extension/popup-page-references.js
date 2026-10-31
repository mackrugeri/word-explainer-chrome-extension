(() => {
  const el=id=>document.getElementById(id);let record=null;
  function render(value){if(!value)return;record=value;
    el('references-title').textContent=record.title||'References for this page';
    const source=el('references-source');source.removeAttribute('href');source.textContent='';try{const url=new URL(record.url);if(['https:','http:'].includes(url.protocol)){source.href=url.href;source.textContent=url.hostname;}}catch{}
    el('references-status').textContent=record.status==='error'?record.error:record.status==='complete'?(record.saveWarning||'Saved locally · ChatGPT-reported research'):(record.stage||'Researching…');
    el('references-list').replaceChildren();el('references-note').textContent='';
    if(record.status==='complete'){
      const report=WordPageReferences.parse(record.text);el('references-note').textContent=report.note;
      if(!report.references.length)el('references-note').append(document.createTextNode(' No verified references were returned.'));
      for(const item of report.references){
        const li=document.createElement('li'),link=document.createElement('a'),meta=document.createElement('p'),why=document.createElement('p');
        link.textContent=item.title;link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';
        meta.className='reference-meta';meta.textContent=[item.author,item.year,new URL(item.url).hostname].filter(Boolean).join(' · ');
        why.textContent=item.relevance;li.append(link,meta,why);el('references-list').append(li);
      }
    }
    el('references-refresh').disabled=record.status==='running';el('references-refresh').hidden=record.status==='running';el('page-references').disabled=false;
  }
  async function open(refresh=false){el('popup-home').hidden=true;el('references-view').hidden=false;document.documentElement.style.setProperty('--summary-width',`${Math.max(300,Math.min(520,screen.availWidth-32))}px`);document.documentElement.classList.add('summary-reader');el('references-title').focus({preventScroll:true});el('references-status').textContent='Opening references…';el('references-refresh').disabled=true;
    try{const reply=await chrome.runtime.sendMessage({type:'PAGE_REFERENCES_START',refresh});if(!reply?.ok)throw Error(reply?.error||'Could not find references.');render(reply.record);}catch(error){el('references-status').textContent=error.message;el('references-refresh').disabled=false;}
  }
  el('page-references').addEventListener('click',()=>open());el('references-refresh').addEventListener('click',()=>open(true));
  el('references-back').addEventListener('click',()=>{el('references-view').hidden=true;el('popup-home').hidden=false;document.documentElement.classList.remove('summary-reader');el('page-references').focus();});
  chrome.runtime.onMessage.addListener((message,sender)=>{if(sender.id===chrome.runtime.id&&message.type==='PAGE_REFERENCES_UPDATED'&&record)chrome.runtime.sendMessage({type:'PAGE_REFERENCES_GET',url:record.url}).then(reply=>{if(reply?.ok)render(reply.record);}).catch(()=>{});});
})();
