// Shadow UI and fixed overlays never wrap or replace page text.
(() => {
  const host=document.createElement('div');host.dataset.wordNotes='';host.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483645';
  globalThis.WordTheme?.register(host);
  const root=host.attachShadow({mode:'closed'});
  root.innerHTML=`<style>:host{all:initial}*{box-sizing:border-box}[hidden]{display:none!important}button,textarea{font:14px system-ui}button{cursor:pointer}button:focus-visible,textarea:focus-visible{outline:3px solid #77baa0}.icon{position:fixed;pointer-events:auto;background:#16654f;color:white;border:1px solid white;border-radius:50%;width:25px;height:25px}.missing{position:fixed;bottom:16px;left:16px;pointer-events:auto}.editor{position:fixed;pointer-events:auto;top:15vh;left:50%;transform:translateX(-50%);width:min(360px,calc(100vw - 24px));max-height:75vh;overflow:auto;padding:18px;background:white;color:#19332e;border:1px solid #b6cbbf;border-radius:14px;box-shadow:0 10px 35px #0004;font:14px/1.5 system-ui}textarea{width:100%;min-height:150px;resize:vertical}p{white-space:pre-wrap;overflow-wrap:anywhere}button{padding:6px 10px}#quote{max-height:90px;overflow:auto}#status{font-size:12px}.editor{--note-bg:#fff;--note-ink:#222e27;--note-muted:#647268;--note-line:#dce3dc;--note-soft:#f3f6f1;--note-accent:#245d47;background:var(--note-bg);color:var(--note-ink);border-color:var(--note-line);border-radius:12px;box-shadow:0 16px 40px #15271b24;padding:20px}#quote{background:var(--note-soft);border-left:3px solid var(--note-accent);padding:10px 12px;border-radius:6px;font-size:13px}textarea{border:1px solid var(--note-line);border-radius:8px;padding:11px;background:var(--note-bg);color:var(--note-ink);line-height:1.6}#count,#status{font-size:11px;color:var(--note-muted)}.editor button,.missing{border:1px solid var(--note-line);border-radius:8px;background:var(--note-bg);color:var(--note-ink);padding:8px 13px;min-height:36px}#save{background:var(--note-accent);border-color:var(--note-accent);color:#fff}#delete{color:#a2352d}#close{float:right}.icon{display:grid;place-items:center;padding:0;font-size:13px;touch-action:none;user-select:none;cursor:grab}.icon:active{cursor:grabbing}button:disabled{opacity:.5;cursor:wait}:host([data-we-theme="dark"]) .editor{--note-bg:#1d2720;--note-ink:#ecf0ea;--note-muted:#adbaaf;--note-line:#38473b;--note-soft:#26332a;--note-accent:#b3d8bf}:host([data-we-theme="dark"]) #save{color:#182a1e}:host([data-we-theme="dark"]) #delete{color:#f1a79d}:host([data-we-theme="dark"]) .missing{background:#1d2720;color:#ecf0ea;border-color:#38473b}</style><div id="icons"></div><button class="missing" id="missing" hidden></button><section class="editor" id="editor" role="dialog" aria-label="Personal note" hidden><strong>Notes Taken</strong><p id="quote" dir="auto"></p><textarea id="body" dir="auto" aria-label="Personal note" maxlength="12000" placeholder="A short personal note, usually 60–70 words"></textarea><p id="count" role="status"></p><p id="status" role="status"></p><button id="save">Save</button> <button id="delete">Delete</button> <button id="close">Close</button></section>`;
  globalThis.WordUIIcons?.decorate(root);
  document.documentElement.appendChild(host);
  const el=id=>root.getElementById(id);let notes=[],editing=null,currentUrl=page(),generation=0,loading=false,reloadPending=false;
  function page(){const u=new URL(location.href);u.hash='';return u.href;}
  async function send(type,record){const result=await chrome.runtime.sendMessage({type,pageUrl:currentUrl,record});if(!result?.ok)throw Error(result?.error||'Notes unavailable. Refresh after reloading the extension.');return result;}
  function count(){const words=el('body').value.trim().split(/\s+/u).filter(Boolean).length;el('count').textContent=`${words} / 100 words · English or Urdu`;el('save').disabled=!words||words>100;}
  let editorReturnFocus=null;
  function closeEditor(){el('editor').hidden=true;editorReturnFocus?.focus?.({preventScroll:true});}
  function open(note){editorReturnFocus=root.activeElement||document.activeElement;editing=note;el('quote').textContent=note.anchor.exact;el('body').value=note.body||'';el('delete').hidden=!note.id;el('status').textContent=note.missing?'Passage could not be matched confidently. Your note is still saved.':'';el('editor').hidden=false;count();el('body').focus();}
  el('body').addEventListener('input',count);el('close').onclick=closeEditor;root.addEventListener('keydown',e=>{if(el('editor').hidden)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeEditor();}if(e.key==='Tab'){const items=[...el('editor').querySelectorAll('textarea,button:not([disabled])')].filter(node=>node.getClientRects().length),first=items[0],last=items.at(-1);if(e.shiftKey&&root.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&root.activeElement===last){e.preventDefault();first.focus();}}});
  async function mutate(type){el('save').disabled=true;try{await send(type,{...editing,body:el('body').value});el('editor').hidden=true;await load();}catch(error){el('status').textContent=error.message;count();}}
  el('save').onclick=()=>mutate('NOTES_SAVE');el('delete').onclick=()=>mutate('NOTES_DELETE');
  let dragging=null;const iconOffsets=new Map();
  const clampIcon=(value,size)=>Math.max(0,Math.min(Math.max(0,size-27),value));
  function attachDrag(button,note,base){
    let suppressClick=false;
    button.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.isPrimary===false)return;
      const rect=button.getBoundingClientRect();dragging={button,note,base,id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,moved:false};
      event.preventDefault();button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove',event=>{
      const drag=dragging;if(!drag||drag.button!==button||drag.id!==event.pointerId)return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<5)return;
      drag.moved=true;suppressClick=true;event.preventDefault();
      button.style.left=`${clampIcon(drag.left+dx,innerWidth)}px`;button.style.top=`${clampIcon(drag.top+dy,innerHeight)}px`;
    });
    function end(event,cancelled=false){
      const drag=dragging;if(!drag||drag.button!==button||drag.id!==event.pointerId)return;dragging=null;
      if(drag.moved&&!cancelled){
        const position=button.getBoundingClientRect(),offset={x:Math.round(position.left-base.left),y:Math.round(position.top-base.top)};
        // One local write at the end of a drag; movement never writes or scans the page.
        iconOffsets.set(note.id,offset);note.iconOffset=offset;
        send('NOTES_MOVE',{id:note.id,iconOffset:offset}).catch(()=>{button.title='Position kept for this page; could not save it. Drag again to retry.';});
      }
      if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId);
      schedule();
    }
    button.addEventListener('pointerup',event=>end(event));button.addEventListener('pointercancel',event=>end(event,true));button.addEventListener('lostpointercapture',event=>end(event,true));
    button.onclick=()=>{if(suppressClick){suppressClick=false;return;}open(note);};
  }
  function paint(){
    if(dragging)return;
    el('icons').replaceChildren();const ids=new Set(notes.map(note=>note.id));for(const id of iconOffsets.keys())if(!ids.has(id))iconOffsets.delete(id);const missing=[];
    for(const note of notes){const range=WordNotesAnchor.resolve(document,note.anchor);const rects=range?[...range.getClientRects()].filter(r=>r.width&&r.height):[];const rect=rects.at(-1);if(!rect){missing.push(note);continue;}if(rect.bottom<0||rect.top>innerHeight)continue;
      const button=document.createElement('button');button.className='icon';button.textContent='✎';button.title=`Personal note: ${note.anchor.exact.slice(0,80)} · Click to open, drag to move`;button.setAttribute('aria-label',button.title);
      const base={left:rect.right+3,top:rect.top},offset=iconOffsets.get(note.id)||note.iconOffset||{x:0,y:0};
      button.style.left=`${clampIcon(base.left+(Number.isFinite(offset.x)?offset.x:0),innerWidth)}px`;button.style.top=`${clampIcon(base.top+(Number.isFinite(offset.y)?offset.y:0),innerHeight)}px`;
      attachDrag(button,note,base);el('icons').appendChild(button);
    }
    el('missing').hidden=!missing.length;el('missing').textContent=`${missing.length} notes · passage unavailable`;el('missing').onclick=()=>{const note=missing.shift();if(note){open({...note,missing:true});missing.push(note);}};
  }
  async function load(){if(loading){reloadPending=true;return;}loading=true;const epoch=++generation;try{const response=await send('NOTES_LIST');if(epoch===generation){notes=response.notes.filter(n=>n.url===currentUrl);paint();}}catch{}finally{loading=false;if(reloadPending){reloadPending=false;load();}}}
  let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;paint();});}
  const observer=new MutationObserver(events=>{if(events.some(e=>!host.contains(e.target)))schedule();});observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  addEventListener('scroll',schedule,true);addEventListener('resize',schedule);setInterval(()=>{if(page()!==currentUrl){currentUrl=page();generation++;notes=[];iconOffsets.clear();dragging=null;el('editor').hidden=true;load();}},1000);
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.wordPersonalNotesV1)load();});
  globalThis.WordNotesPanel={open(range){const anchor=WordNotesAnchor.capture(document,range);if(!anchor)return false;const existing=notes.find(n=>JSON.stringify(n.anchor)===JSON.stringify(anchor));open(existing||{anchor,body:''});return true;}};
  load();
})();
