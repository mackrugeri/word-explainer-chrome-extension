// Event-driven selection affordance. No polling, observers, model requests or page wrappers.
(() => {
  function create({open,isPanelOpen}){
    const host=document.createElement('div');host.dataset.wordSelectionLauncher='';host.style.cssText='position:fixed;display:none;z-index:2147483646';
    const untheme=globalThis.WordTheme?.register(host),root=host.attachShadow({mode:'closed'});
    root.innerHTML=`<style>:host{all:initial}button{display:grid;place-items:center;width:30px;height:30px;padding:0;border:1px solid #fff6;border-radius:8px;background:#245d47;color:#fff;box-shadow:0 3px 10px #15271b26;font:650 16px/1 Georgia,serif;cursor:pointer}button:hover{background:#194c38}button:focus-visible{outline:3px solid #6ba788;outline-offset:3px}:host([data-we-theme="dark"]) button{background:#b3d8bf;color:#182a1e;border-color:#38473b}</style><button type="button" aria-label="Open Reel Trail" title="Open Reel Trail">W</button>`;
    document.documentElement.appendChild(host);
    const button=root.querySelector('button');let mode='selection',timer=null,snapshot=null,disposed=false;
    const hide=()=>{host.style.display='none';snapshot=null;clearTimeout(timer);timer=null;};
    const editable=node=>{const element=node?.nodeType===1?node:node?.parentElement;return element?.isContentEditable||element?.closest?.('input,textarea,select,[data-word-notes],[data-word-selection-launcher]');};
    function eligible(range){return range&&!range.collapsed&&range.commonAncestorContainer?.isConnected&&range.commonAncestorContainer.ownerDocument===document&&!editable(range.commonAncestorContainer)&&!editable(range.startContainer)&&!editable(range.endContainer);}
    function update(){
      timer=null;if(disposed||mode!=='selection'||isPanelOpen()){hide();return;}
      const selection=window.getSelection();if(!selection?.rangeCount){hide();return;}
      const text=String(selection).trim(),range=selection.getRangeAt(0);
      if(!text||text.length>8000||!eligible(range)){hide();return;}
      const rect=range.getBoundingClientRect();if(!rect.width||!rect.height||rect.bottom<0||rect.top>innerHeight){hide();return;}
      snapshot={range:range.cloneRange(),text:String(range)};
      host.style.left=`${Math.max(8,Math.min(rect.right-30,innerWidth-38))}px`;
      host.style.top=`${Math.max(8,Math.min(rect.top>=42?rect.top-38:rect.bottom+8,innerHeight-38))}px`;
      host.style.display='block';
    }
    function schedule(event){if(event?.composedPath?.().includes(host))return;if(mode!=='selection')return;clearTimeout(timer);timer=setTimeout(update,50);}
    function down(event){if(!event.composedPath().includes(host))hide();}
    function escape(event){if(event.key==='Escape')hide();}
    button.addEventListener('pointerdown',event=>event.preventDefault());
    button.addEventListener('mousedown',event=>event.preventDefault());
    button.addEventListener('click',()=>{
      const saved=snapshot;if(!saved||!eligible(saved.range)||String(saved.range)!==saved.text){hide();return;}
      const selection=window.getSelection();selection.removeAllRanges();selection.addRange(saved.range.cloneRange());hide();open();
    });
    const listeners=[[document,'selectionchange',schedule],[document,'pointerup',schedule],[document,'pointerdown',down],[document,'keydown',escape],[document,'scroll',hide,true],[window,'resize',hide],[window,'blur',hide],[window,'pagehide',hide]];
    for(const [target,type,fn,capture]of listeners)target.addEventListener(type,fn,capture);
    function changed(changes,area){if(area==='local'&&changes.activationMode){mode=changes.activationMode.newValue==='shortcut'?'shortcut':'selection';hide();}}
    chrome.storage.onChanged.addListener(changed);
    chrome.storage.local.get({activationMode:'selection'}).then(value=>{mode=value.activationMode==='shortcut'?'shortcut':'selection';if(mode==='shortcut')hide();}).catch(()=>{});
    return {hide,dispose(){disposed=true;hide();for(const [target,type,fn,capture]of listeners)target.removeEventListener(type,fn,capture);chrome.storage.onChanged.removeListener?.(changed);untheme?.();host.remove();}};
  }
  globalThis.WordSelectionLauncher={create};
})();
