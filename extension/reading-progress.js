// Local, URL-scoped reading position. No page text leaves the browser.
(() => {
 const KEY='wordReadingProgressV1';
 function canonical(value){const u=new URL(value);if(!['http:','https:'].includes(u.protocol))throw Error('Open a webpage to track reading.');u.hash='';return u.href;}
 function createStore(storage){
  let queue=Promise.resolve();const run=task=>{const result=queue.then(task);queue=result.catch(()=>{});return result;};
  const read=async()=>{const rows=(await storage.get(KEY))[KEY];return Array.isArray(rows)?rows:[];};
  function update(url,patch){return run(async()=>{let rows=await read();const old=rows.find(item=>item.url===url)||{url};const next={...old,...patch,furthestRatio:Math.max(old.furthestRatio||0,old.position?.ratio||0,patch.position?.ratio||0,patch.furthestRatio||0),updated:Date.now()};
   if(patch.timer){const sessions=Array.isArray(old.timeSessions)?old.timeSessions:[],previous=sessions.find(item=>item.id===patch.timer.id)?.total||0,total=Math.max(previous,patch.timer.total);next.activeMs=(old.activeMs||0)+Math.max(0,total-previous);next.timeSessions=[...sessions.filter(item=>item.id!==patch.timer.id),{id:patch.timer.id,total}].slice(-16);delete next.timer;}
   rows=rows.filter(item=>item.url!==url);rows.push(next);await storage.set({[KEY]:rows.slice(-200)});return next;});}
  return{get:url=>run(async()=>(await read()).find(item=>item.url===url)||null),update,
   clearPage:url=>run(async()=>storage.set({[KEY]:(await read()).filter(item=>item.url!==url)})),
   clearSite:site=>run(async()=>storage.set({[KEY]:(await read()).filter(item=>new URL(item.url).origin!==site)}))};
 }
 function createService(chrome,store){
  function handle(message,sender,reply){
   if(!['READING_GET','READING_SAVE','READING_STOPPER'].includes(message.type))return false;
   let url;try{if(sender.id!==chrome.runtime.id||!Number.isInteger(sender.tab?.id)||sender.frameId!==0)throw Error('Use page tools to track reading.');url=canonical(sender.url);if(message.url&&canonical(message.url)!==url){const requested=canonical(message.url);if(message.type!=='READING_SAVE'||new URL(requested).origin!==new URL(url).origin)throw Error('This page has changed. Reopen page tools.');url=requested;}}catch(error){reply({ok:false,error:error.message});return true;}
   let task;
   try{
    if(message.type==='READING_GET')task=store.get(url);
    else if(message.type==='READING_SAVE'){
     const p=message.position,t=message.timer;
     if(p&&(!Number.isFinite(p.y)||!Number.isFinite(p.ratio)||p.y<0||p.y>100000000||p.ratio<0||p.ratio>1||p.scope&&!['window','panel'].includes(p.scope)))throw Error('Invalid reading position.');
     if(t&&(!/^[a-zA-Z0-9-]{8,100}$/.test(t.id||'')||!Number.isFinite(t.total)||t.total<0||t.total>31622400000))throw Error('Invalid reading time.');
     if(!p&&!t)throw Error('No reading activity to save.');
     if(message.furthestRatio!=null&&(!Number.isFinite(message.furthestRatio)||message.furthestRatio<0||message.furthestRatio>1))throw Error('Invalid reading progress.');
     task=store.update(url,{...(p?{position:{y:p.y,ratio:p.ratio,scope:p.scope||'window'}}:{}),...(t?{timer:{id:t.id,total:t.total}}:{}),furthestRatio:message.furthestRatio||0,title:String(message.title||'').slice(0,180)});
    }else{
     const s=message.stopper;if(s!==null&&(!s||!Number.isFinite(s.y)||s.y<0||s.y>100000000||!Number.isFinite(s.offset)||Math.abs(s.offset)>100000||s.x!=null&&(!Number.isFinite(s.x)||s.x<0||s.x>1)||s.markerOffset!=null&&(!Number.isFinite(s.markerOffset)||s.markerOffset<0||s.markerOffset>80)||s.anchor&&(!s.anchor.exact||s.anchor.exact.length>800||String(s.anchor.prefix||'').length>80||String(s.anchor.suffix||'').length>80)))throw Error('Invalid reading stopper.');
     task=store.update(url,{stopper:s===null?null:{y:s.y,offset:s.offset,x:s.x??null,markerOffset:s.markerOffset??80,anchor:s.anchor?{exact:String(s.anchor.exact),prefix:String(s.anchor.prefix||''),suffix:String(s.anchor.suffix||'')}:null}});
    }
   }catch(error){reply({ok:false,error:error.message});return true;}
   task.then(record=>reply({ok:true,record}),error=>reply({ok:false,error:error.message||'Could not save reading progress.'}));return true;
  }
  return{handle};
 }
 function createTracker({onChange=()=>{},idleMs=60000,tickMs=1000,flushMs=15000}={}){
  let url=canonical(location.href),record=null,ready=false,timer=null,revision=0,lastY=-1,lastRatio=-1,range=null,paused=false,dirty=false,pendingPosition=null,peak=0;
  let scrollRoot=document.scrollingElement,sessionId=crypto.randomUUID(),elapsed=0,since=null,lastActivity=performance.now(),clockTimer=null,lastFlush=lastActivity,focused=document.hasFocus();
  function scrollable(element){return element&&element!==document.scrollingElement&&element.clientHeight>100&&element.clientWidth>160&&element.scrollHeight>element.clientHeight+1&&/auto|scroll|overlay/.test(getComputedStyle(element).overflowY);}
  function findRoot(){const scope=document.querySelector('article,main,[role="main"]')||document.body;for(let e=scope;e;e=e.parentElement)if(scrollable(e))return e;let best=null,area=0;for(const e of Array.from(scope?.querySelectorAll('*')||[]).slice(0,160)){if(e.closest('nav,aside,input,textarea')||!scrollable(e))continue;const r=e.getBoundingClientRect(),size=Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.top))*Math.max(0,Math.min(innerWidth,r.right)-Math.max(0,r.left));if(size>area){best=e;area=size;}}return best||document.scrollingElement;}
  function root(){if(!scrollRoot?.isConnected)scrollRoot=findRoot();return scrollRoot||document.scrollingElement;}
  const offset=()=>Math.max(0,root()?.scrollTop||0);
  const max=()=>Math.max(0,(root()?.scrollHeight||0)-(root()?.clientHeight||innerHeight));
  const position=()=>{const y=offset();return{y,ratio:max()?Math.min(1,y/max()):0,scope:root()===document.scrollingElement?'window':'panel'};};
  async function send(type,extra={}){const result=await chrome.runtime.sendMessage({type,url,...extra});if(!result?.ok)throw Error(result?.error||'Reading progress is unavailable.');return result.record;}
  function active(now=performance.now()){return ready&&!paused&&focused&&document.visibilityState==='visible'&&now-lastActivity<idleMs;}
  function settle(now=performance.now()){if(since!==null)elapsed+=Math.max(0,Math.min(now,lastActivity+idleMs)-since);since=active(now)?now:null;}
  function notify(){let markerY=record?.stopper?record.stopper.y-offset()+(record.stopper.markerOffset??80):null;if(record?.stopper&&range?.startContainer?.isConnected)markerY=range.getBoundingClientRect().top-record.stopper.offset+(record.stopper.markerOffset??80);const saved=record?.timeSessions?.find(item=>item.id===sessionId)?.total||0;onChange({record,ready,markerY,furthestRatio:Math.max(peak,record?.furthestRatio||0,record?.position?.ratio||0),activeMs:(record?.activeMs||0)+Math.max(0,elapsed-saved),timerActive:active()});}
  function armClock(){if(clockTimer!==null)clearTimeout(clockTimer);clockTimer=null;if(active())clockTimer=setTimeout(clockTick,Math.min(tickMs,Math.max(1,lastActivity+idleMs-performance.now())));}
  function clockTick(){clockTimer=null;settle();notify();if(!active()||performance.now()-lastFlush>=flushMs)save();armClock();}
  function activity(event){if(event&&event.isTrusted===false)return;settle();lastActivity=performance.now();paused=false;since=active()?lastActivity:null;armClock();}
  async function load(){const version=++revision;ready=false;record=null;range=null;paused=false;dirty=false;pendingPosition=null;peak=0;lastY=-1;lastRatio=-1;scrollRoot=findRoot();sessionId=crypto.randomUUID();elapsed=0;since=null;lastActivity=performance.now();lastFlush=lastActivity;if(clockTimer!==null)clearTimeout(clockTimer);clockTimer=null;notify();try{const saved=await send('READING_GET');if(version!==revision)return;record=saved;peak=Math.max(peak,saved?.furthestRatio||0,saved?.position?.ratio||0);try{range=saved?.stopper?.anchor&&globalThis.WordNotesAnchor?.resolve(document,saved.stopper.anchor);}catch{range=null;}ready=true;since=active()?performance.now():null;notify();armClock();if(dirty)timer=setTimeout(save,1000);}catch{if(version===revision){ready=true;notify();}}}
  async function save(){clearTimeout(timer);timer=null;settle();if(!ready||paused)return;const savedTime=record?.timeSessions?.find(item=>item.id===sessionId)?.total||0;if(!dirty&&elapsed<=savedTime)return;
   const p=dirty?pendingPosition:null;if(p&&Math.abs(p.y-lastY)<2&&p.ratio===lastRatio&&peak<=(record?.furthestRatio||0)&&elapsed<=savedTime){dirty=false;return;}
   const version=revision;dirty=false;lastFlush=performance.now();if(p){lastY=p.y;lastRatio=p.ratio;}
   try{const saved=await send('READING_SAVE',{...(p?{position:p}:{}),timer:{id:sessionId,total:Math.round(elapsed)},furthestRatio:peak,title:document.title});if(version===revision){record=saved;peak=Math.max(peak,saved.furthestRatio||0);notify();}}catch{if(version===revision){if(p)dirty=true;lastY=-1;}}
  }
  function scroll(event){const target=event?.target;if(target!==document&&target!==window){if(target?.nodeType!==1||target.closest('nav,aside,input,textarea')||!scrollable(target))return;const scope=document.querySelector('article,main,[role="main"]')||document.body;if(!scope?.contains(target)&&!target.contains(scope))return;scrollRoot=target;}
   if(document.visibilityState!=='visible')return;paused=false;pendingPosition=position();dirty=true;peak=Math.max(peak,pendingPosition.ratio);notify();if(!timer)timer=setTimeout(save,1000);
  }
  function anchorHere(point=null){
   const selection=getSelection();let r=!point&&selection?.rangeCount&&!selection.isCollapsed?selection.getRangeAt(0).cloneRange():null;
   if(!r||!document.body.contains(r.commonAncestorContainer)||String(r).length>800||r.getBoundingClientRect().bottom<0||r.getBoundingClientRect().top>innerHeight){r=null;for(const x of (point?[point.x+16]:[innerWidth*.35,innerWidth*.5,innerWidth*.2])){const candidate=document.caretRangeFromPoint?.(x,(point?point.y+16:Math.min(100,innerHeight/4)));if(candidate?.startContainer.nodeType===3&&candidate.startContainer.data.trim()){r=candidate;const node=r.startContainer;r.setEnd(node,Math.min(node.length,r.startOffset+160));if(!r.collapsed)break;r=null;}}}
   if(!r||r.collapsed){
    const element=document.elementFromPoint(point?point.x+16:innerWidth*.35,(point?point.y+16:Math.min(100,innerHeight/4)));
    const block=element?.closest('p,li,h1,h2,h3,h4,blockquote,pre');
    if(block){const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);let text;while(text=walker.nextNode())if(text.data.trim()){r=document.createRange();r.setStart(text,0);r.setEnd(text,Math.min(160,text.length));break;}}
   }
   const anchor=globalThis.WordNotesAnchor?.capture(document,r);return{r,anchor};
  }
  async function setStopper(remove=false,point=null){if(!ready)throw Error('Reading progress is still loading.');const version=revision;const {r,anchor}=remove?{}:anchorHere(point);const targetY=point?Math.max(0,offset()+point.y-80):offset();const stopper=remove?null:{y:targetY,offset:anchor?offset()+r.getBoundingClientRect().top-targetY:0,x:point?Math.max(0,Math.min(1,point.x/innerWidth)):record?.stopper?.x??null,markerOffset:point?offset()+point.y-targetY:80,anchor:anchor||null};const saved=await send('READING_STOPPER',{stopper});if(version===revision){record=saved;range=anchor?r:null;notify();}}
  function resume(){
   if(!ready)return;let y=record?.position?.y||0,exact=false;
   if(record?.stopper){const s=record.stopper;y=s.y;try{if(!range?.startContainer?.isConnected)range=s.anchor&&globalThis.WordNotesAnchor?.resolve(document,s.anchor);if(range){y=offset()+range.getBoundingClientRect().top-s.offset;exact=true;}}catch{range=null;}}
   root()?.scrollTo({top:Math.max(0,Math.min(max(),y)),behavior:'instant'});notify();return{stopper:!!record?.stopper,exact};
  }
  function checkPage(){const next=canonical(location.href);if(next===url)return;save();clearTimeout(timer);timer=null;url=next;load();}
  window.addEventListener('resize',notify);document.addEventListener('scroll',scroll,{passive:true,capture:true});window.addEventListener('pagehide',()=>{focused=false;save();if(clockTimer!==null)clearTimeout(clockTimer);clockTimer=null;});
  for(const name of ['pointerdown','pointermove','keydown','wheel'])document.addEventListener(name,activity,{passive:true,capture:true});
  window.addEventListener('blur',()=>{focused=false;settle();notify();save();armClock();});window.addEventListener('focus',()=>{focused=true;lastActivity=performance.now();settle();notify();armClock();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')lastActivity=performance.now();settle();notify();if(document.visibilityState==='hidden')save();armClock();});
  window.addEventListener('popstate',checkPage);window.navigation?.addEventListener('currententrychange',checkPage);
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local'||!changes[KEY])return;const saved=(changes[KEY].newValue||[]).find(item=>item.url===url)||null;if(JSON.stringify(record?.stopper)!==JSON.stringify(saved?.stopper))range=null;record=saved;if(!saved){revision++;paused=true;dirty=false;pendingPosition=null;peak=0;elapsed=0;since=null;if(clockTimer!==null)clearTimeout(clockTimer);clockTimer=null;clearTimeout(timer);timer=null;lastY=-1;range=null;}else peak=Math.max(peak,saved.furthestRatio||0,saved.position?.ratio||0);notify();});
  load();return{setStopper,resume,save,get:()=>({record,ready}),refresh:load};
 }
 globalThis.WordReadingProgress={KEY,canonical,createStore,createService,createTracker};
})();
