// Local, URL-scoped reading position. No page text leaves the browser.
(() => {
 const KEY='wordReadingProgressV1';
 function canonical(value){const u=new URL(value);if(!['http:','https:'].includes(u.protocol))throw Error('Open a webpage to track reading.');u.hash='';return u.href;}
 function createStore(storage){
  let queue=Promise.resolve();const run=task=>{const result=queue.then(task);queue=result.catch(()=>{});return result;};
  const read=async()=>{const rows=(await storage.get(KEY))[KEY];return Array.isArray(rows)?rows:[];};
  function update(url,patch){return run(async()=>{let rows=await read();const old=rows.find(item=>item.url===url)||{url};const next={...old,...patch,updated:Date.now()};rows=rows.filter(item=>item.url!==url);rows.push(next);await storage.set({[KEY]:rows.slice(-200)});return next;});}
  return{get:url=>run(async()=>(await read()).find(item=>item.url===url)||null),update,
   clearPage:url=>run(async()=>storage.set({[KEY]:(await read()).filter(item=>item.url!==url)})),
   clearSite:site=>run(async()=>storage.set({[KEY]:(await read()).filter(item=>new URL(item.url).origin!==site)}))};
 }
 function createService(chrome,store){
  function handle(message,sender,reply){
   if(!['READING_GET','READING_SAVE','READING_STOPPER'].includes(message.type))return false;
   let url;try{if(sender.id!==chrome.runtime.id||!Number.isInteger(sender.tab?.id)||sender.frameId!==0)throw Error('Use page tools to track reading.');url=canonical(sender.url);if(message.url&&canonical(message.url)!==url)throw Error('This page has changed. Reopen page tools.');}catch(error){reply({ok:false,error:error.message});return true;}
   let task;
   try{
    if(message.type==='READING_GET')task=store.get(url);
    else if(message.type==='READING_SAVE'){
     const p=message.position;if(!p||!Number.isFinite(p.y)||!Number.isFinite(p.ratio)||p.y<0||p.y>100000000||p.ratio<0||p.ratio>1)throw Error('Invalid reading position.');
     task=store.update(url,{position:{y:p.y,ratio:p.ratio},title:String(message.title||'').slice(0,180)});
    }else{
     const s=message.stopper;if(s!==null&&(!s||!Number.isFinite(s.y)||s.y<0||s.y>100000000||!Number.isFinite(s.offset)||Math.abs(s.offset)>100000||s.anchor&&(!s.anchor.exact||s.anchor.exact.length>800||String(s.anchor.prefix||'').length>80||String(s.anchor.suffix||'').length>80)))throw Error('Invalid reading stopper.');
     task=store.update(url,{stopper:s===null?null:{y:s.y,offset:s.offset,anchor:s.anchor?{exact:String(s.anchor.exact),prefix:String(s.anchor.prefix||''),suffix:String(s.anchor.suffix||'')}:null}});
    }
   }catch(error){reply({ok:false,error:error.message});return true;}
   task.then(record=>reply({ok:true,record}),error=>reply({ok:false,error:error.message||'Could not save reading progress.'}));return true;
  }
  return{handle};
 }
 function createTracker({onChange=()=>{}}={}){
  let url=canonical(location.href),record=null,ready=false,timer=null,revision=0,lastY=-1,range=null,paused=false;
  const max=()=>Math.max(0,(document.scrollingElement?.scrollHeight||0)-innerHeight);
  const position=()=>{const y=Math.max(0,scrollY);return{y,ratio:max()?Math.min(1,y/max()):0};};
  async function send(type,extra={}){const result=await chrome.runtime.sendMessage({type,url,...extra});if(!result?.ok)throw Error(result?.error||'Reading progress is unavailable.');return result.record;}
  function notify(){let markerY=record?.stopper?record.stopper.y-scrollY+80:null;if(record?.stopper&&range?.startContainer?.isConnected)markerY=range.getBoundingClientRect().top-record.stopper.offset+80;onChange({record,ready,markerY});}
  async function load(){const version=++revision;ready=false;record=null;range=null;paused=false;lastY=-1;try{const saved=await send('READING_GET');if(version!==revision)return;record=saved;try{range=saved?.stopper?.anchor&&globalThis.WordNotesAnchor?.resolve(document,saved.stopper.anchor);}catch{range=null;}ready=true;notify();}catch{if(version===revision){ready=true;notify();}}}
  async function save(){clearTimeout(timer);timer=null;if(!ready||paused)return;const p=position();if(Math.abs(p.y-lastY)<2)return;lastY=p.y;const version=revision;try{const saved=await send('READING_SAVE',{position:p,title:document.title});if(version===revision){record=saved;notify();}}catch{lastY=-1;}}
  function scroll(event){if(event?.target!==document&&event?.target!==window)return;paused=false;notify();if(!timer)timer=setTimeout(save,1000);}
  function anchorHere(){
   const selection=getSelection();let r=selection?.rangeCount&&!selection.isCollapsed?selection.getRangeAt(0).cloneRange():null;
   if(!r||!document.body.contains(r.commonAncestorContainer)||String(r).length>800||r.getBoundingClientRect().bottom<0||r.getBoundingClientRect().top>innerHeight){r=null;for(const x of [innerWidth*.35,innerWidth*.5,innerWidth*.2]){const candidate=document.caretRangeFromPoint?.(x,Math.min(100,innerHeight/4));if(candidate?.startContainer.nodeType===3&&candidate.startContainer.data.trim()){r=candidate;const node=r.startContainer;r.setEnd(node,Math.min(node.length,r.startOffset+160));if(!r.collapsed)break;r=null;}}}
   if(!r||r.collapsed){
    const element=document.elementFromPoint(innerWidth*.35,Math.min(100,innerHeight/4));
    const block=element?.closest('p,li,h1,h2,h3,h4,blockquote,pre');
    if(block){const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);let text;while(text=walker.nextNode())if(text.data.trim()){r=document.createRange();r.setStart(text,0);r.setEnd(text,Math.min(160,text.length));break;}}
   }
   const anchor=globalThis.WordNotesAnchor?.capture(document,r);return{r,anchor};
  }
  async function setStopper(remove=false){if(!ready)throw Error('Reading progress is still loading.');const version=revision;const {r,anchor}=remove?{}:anchorHere();const stopper=remove?null:{y:Math.max(0,scrollY),offset:anchor?r.getBoundingClientRect().top:0,anchor:anchor||null};const saved=await send('READING_STOPPER',{stopper});if(version===revision){record=saved;range=anchor?r:null;notify();}}
  function resume(){
   if(!ready)return;let y=record?.position?.y||0,exact=false;
   if(record?.stopper){const s=record.stopper;y=s.y;try{if(!range?.startContainer?.isConnected)range=s.anchor&&globalThis.WordNotesAnchor?.resolve(document,s.anchor);if(range){y=scrollY+range.getBoundingClientRect().top-s.offset;exact=true;}}catch{range=null;}}
   window.scrollTo({top:Math.max(0,Math.min(max(),y)),behavior:'instant'});return{stopper:!!record?.stopper,exact};
  }
  function checkPage(){const next=canonical(location.href);if(next===url)return;clearTimeout(timer);timer=null;url=next;load();}
  window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();});
  window.addEventListener('popstate',checkPage);window.navigation?.addEventListener('currententrychange',checkPage);
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local'||!changes[KEY])return;const saved=(changes[KEY].newValue||[]).find(item=>item.url===url)||null;if(JSON.stringify(record?.stopper)!==JSON.stringify(saved?.stopper))range=null;record=saved;if(!saved){revision++;paused=true;clearTimeout(timer);timer=null;lastY=-1;range=null;}notify();});
  load();return{setStopper,resume,save,get:()=>({record,ready}),refresh:load};
 }
 globalThis.WordReadingProgress={KEY,canonical,createStore,createService,createTracker};
})();
