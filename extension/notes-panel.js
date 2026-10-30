// Shadow UI and fixed overlays never wrap or replace page text.
(() => {
  const host=document.createElement('div');host.dataset.wordNotes='';host.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483645';
  const root=host.attachShadow({mode:'closed'});
  root.innerHTML=`<style>:host{all:initial}*{box-sizing:border-box}[hidden]{display:none!important}button,textarea{font:14px system-ui}button{cursor:pointer}button:focus-visible,textarea:focus-visible{outline:3px solid #77baa0}.icon{position:fixed;pointer-events:auto;background:#16654f;color:white;border:1px solid white;border-radius:50%;width:25px;height:25px}.missing{position:fixed;bottom:16px;left:16px;pointer-events:auto}.editor{position:fixed;pointer-events:auto;top:15vh;left:50%;transform:translateX(-50%);width:min(360px,calc(100vw - 24px));max-height:75vh;overflow:auto;padding:18px;background:white;color:#19332e;border:1px solid #b6cbbf;border-radius:14px;box-shadow:0 10px 35px #0004;font:14px/1.5 system-ui}textarea{width:100%;min-height:150px;resize:vertical}p{white-space:pre-wrap;overflow-wrap:anywhere}button{padding:6px 10px}#quote{max-height:90px;overflow:auto}#status{font-size:12px}</style><div id="icons"></div><button class="missing" id="missing" hidden></button><section class="editor" id="editor" role="dialog" aria-label="Personal note" hidden><strong>Notes Taken</strong><p id="quote" dir="auto"></p><textarea id="body" dir="auto" aria-label="Personal note" maxlength="12000" placeholder="A short personal note, usually 60–70 words"></textarea><p id="count" role="status"></p><p id="status" role="status"></p><button id="save">Save</button> <button id="delete">Delete</button> <button id="close">Close</button></section>`;
  document.documentElement.appendChild(host);
  const el=id=>root.getElementById(id);let notes=[],editing=null,currentUrl=page(),generation=0,loading=false,reloadPending=false;
  function page(){const u=new URL(location.href);u.hash='';return u.href;}
  async function send(type,record){const result=await chrome.runtime.sendMessage({type,pageUrl:currentUrl,record});if(!result?.ok)throw Error(result?.error||'Notes unavailable. Refresh after reloading the extension.');return result;}
  function count(){const words=el('body').value.trim().split(/\s+/u).filter(Boolean).length;el('count').textContent=`${words} / 100 words · English or Urdu`;el('save').disabled=!words||words>100;}
  function open(note){editing=note;el('quote').textContent=note.anchor.exact;el('body').value=note.body||'';el('delete').hidden=!note.id;el('status').textContent=note.missing?'Passage could not be matched confidently. Your note is still saved.':'';el('editor').hidden=false;count();el('body').focus();}
  el('body').addEventListener('input',count);el('close').onclick=()=>{el('editor').hidden=true;};root.addEventListener('keydown',e=>{if(e.key==='Escape')el('editor').hidden=true;});
  async function mutate(type){el('save').disabled=true;try{await send(type,{...editing,body:el('body').value});el('editor').hidden=true;await load();}catch(error){el('status').textContent=error.message;count();}}
  el('save').onclick=()=>mutate('NOTES_SAVE');el('delete').onclick=()=>mutate('NOTES_DELETE');
  function paint(){
    el('icons').replaceChildren();const missing=[];
    for(const note of notes){const range=WordNotesAnchor.resolve(document,note.anchor);const rects=range?[...range.getClientRects()].filter(r=>r.width&&r.height):[];const rect=rects.at(-1);if(!rect){missing.push(note);continue;}if(rect.bottom<0||rect.top>innerHeight)continue;
      const button=document.createElement('button');button.className='icon';button.textContent='✎';button.title=`Personal note: ${note.anchor.exact.slice(0,80)}`;button.setAttribute('aria-label',button.title);button.style.left=`${Math.max(0,Math.min(innerWidth-27,rect.right+3))}px`;button.style.top=`${Math.max(0,rect.top)}px`;button.onclick=()=>open(note);el('icons').appendChild(button);
    }
    el('missing').hidden=!missing.length;el('missing').textContent=`${missing.length} notes · passage unavailable`;el('missing').onclick=()=>{const note=missing.shift();if(note){open({...note,missing:true});missing.push(note);}};
  }
  async function load(){if(loading){reloadPending=true;return;}loading=true;const epoch=++generation;try{const response=await send('NOTES_LIST');if(epoch===generation){notes=response.notes.filter(n=>n.url===currentUrl);paint();}}catch{}finally{loading=false;if(reloadPending){reloadPending=false;load();}}}
  let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;paint();});}
  const observer=new MutationObserver(events=>{if(events.some(e=>!host.contains(e.target)))schedule();});observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  addEventListener('scroll',schedule,true);addEventListener('resize',schedule);setInterval(()=>{if(page()!==currentUrl){currentUrl=page();generation++;notes=[];el('editor').hidden=true;load();}},1000);
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.wordPersonalNotesV1)load();});
  globalThis.WordNotesPanel={open(range){const anchor=WordNotesAnchor.capture(document,range);if(!anchor)return false;const existing=notes.find(n=>JSON.stringify(n.anchor)===JSON.stringify(anchor));open(existing||{anchor,body:''});return true;}};
  load();
})();
