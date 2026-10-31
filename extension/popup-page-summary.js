(() => {
  const el=id=>document.getElementById(id);let record=null;
  if(globalThis.WordRichResponse){const style=document.createElement('style');style.textContent=WordRichResponse.css;document.head.appendChild(style);}
  function render(value){if(!value)return;record=value;
    el('page-summary-title').textContent=record.title||'Whole page summary';let url;try{url=new URL(record.url);}catch{}
    el('page-summary-source').textContent=url?.hostname||'Current page';if(url&&['https:','http:'].includes(url.protocol))el('page-summary-source').href=url.href;else el('page-summary-source').removeAttribute('href');
    el('page-summary-status').textContent=record.status==='error'?record.error:record.status==='complete'?(record.saveWarning||'Saved summary · ChatGPT'):record.stage||'Summarizing…';
    if(globalThis.WordRichResponse)WordRichResponse.render(el('page-summary-answer'),record.rich,record.text||'');else el('page-summary-answer').textContent=record.text||'';
    el('page-summary-refresh').disabled=record.status==='running';el('page-summary-refresh').hidden=record.status==='running';
    el('page-summary').disabled=false;
  }
  async function read(){if(!record)return;try{const reply=await chrome.runtime.sendMessage({type:'PAGE_SUMMARY_GET',url:record.url});if(reply?.ok)render(reply.record);}catch{}}
  function show(){el('popup-home').hidden=true;el('page-summary-view').hidden=false;document.documentElement.style.setProperty('--summary-width',`${Math.max(300,Math.min(520,screen.availWidth-32))}px`);document.documentElement.classList.add('summary-reader');el('page-summary-title').focus({preventScroll:true});}
  async function open(refresh=false){show();el('page-summary-status').textContent=refresh?'Refreshing summary…':'Opening this page’s summary…';el('page-summary').disabled=true;el('page-summary-refresh').disabled=true;
    try{const reply=await chrome.runtime.sendMessage({type:'PAGE_SUMMARY_START',refresh});if(!reply?.ok)throw Error(reply?.error||'Could not open a page summary.');render(reply.record);}
    catch(error){el('page-summary-status').textContent=error.message;el('page-summary').disabled=false;el('page-summary-refresh').disabled=false;}
  }
  el('page-summary').addEventListener('click',()=>open(false));el('page-summary-refresh').addEventListener('click',()=>open(true));
  el('page-summary-back').addEventListener('click',()=>{el('page-summary-view').hidden=true;el('popup-home').hidden=false;document.documentElement.classList.remove('summary-reader');el('page-summary').focus();});
  chrome.runtime.onMessage.addListener((message,sender)=>{if(sender.id===chrome.runtime.id&&message.type==='PAGE_SUMMARY_UPDATED')read();});globalThis.WordUIIcons?.decorate(document);
})();
