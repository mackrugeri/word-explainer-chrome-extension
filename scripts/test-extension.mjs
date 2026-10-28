import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const dir=new URL('../extension/', import.meta.url).pathname;
const bg=await fs.readFile(dir+'background.js','utf8');
const worker=await fs.readFile(dir+'chatgpt-worker.js','utf8');
const content=await fs.readFile(dir+'content.js','utf8');
for(const name of ['background.js','chatgpt-worker.js','content.js','options.js','popup.js'])new vm.Script(await fs.readFile(dir+name,'utf8'));
const flush=async()=>{for(let i=0;i<30;i++)await new Promise(setImmediate);};
async function testBackground(restart=false,action="explain",translationLanguage="Urdu"){
  let handler,alarmHandler,removedHandler;const store={},closed=[],notifications=[];let submittedPrompt="";
  const chrome={runtime:{id:'test',onMessage:{addListener:f=>handler=f}},commands:{onCommand:{addListener:()=>{}}},
    storage:{session:{get:async()=>structuredClone(store),set:async value=>Object.assign(store,structuredClone(value)),remove:async key=>{delete store[key]}}},
    alarms:{create:async()=>{},clear:async()=>{},onAlarm:{addListener:f=>alarmHandler=f}},
    tabs:{onRemoved:{addListener:f=>removedHandler=f},create:async()=>({id:77}),remove:async id=>closed.push(id),sendMessage:async(id,msg)=>{
      if(id===5){notifications.push(msg);return{received:true};}if(msg.type==='CHATGPT_START')submittedPrompt=msg.prompt;return msg.type==='CHATGPT_READY'?{ready:true,build:'0.1.5'}:{accepted:true};
    }}};
  const boot=()=>vm.runInNewContext(bg,{chrome,console,setTimeout,clearTimeout,Date});boot();
  let ack;const returned=handler({type:'EXPLAIN_SELECTION',text:'borrower',requestId:'r1',build:'0.1.5',action,translationLanguage},{id:'test',tab:{id:5}},v=>ack=v);
  assert.equal(returned,undefined);assert.equal(ack.accepted,true);await flush();assert.equal(store.activeExplanationJob.tabId,77);if(action==='translate'){assert.ok(submittedPrompt.startsWith('Translate'));assert.ok(submittedPrompt.includes('into '+translationLanguage));assert.ok(submittedPrompt.includes('only the translation'));}else assert.ok(submittedPrompt.startsWith('Explain'));
  if(restart)boot();
  handler({type:'CHATGPT_PARTIAL',text:'A borrower receives a loan.'},{id:'test',tab:{id:77}},()=>{});await flush();
  assert.equal(notifications.at(-1).type,'EXPLANATION_PARTIAL');
  handler({type:'CHATGPT_RESULT',ok:true,text:'A borrower receives a loan and agrees to repay it.'},{id:'test',tab:{id:77}},()=>{});await flush();
  assert.equal(notifications.at(-1).type,'EXPLANATION_RESULT');assert.equal(notifications.at(-1).requestId,'r1');
  assert.deepEqual(closed,[77]);assert.equal(store.activeExplanationJob,undefined);
}
async function testWorker(resume=false,existing=false){
  let handler,sent=0,t=0;const messages=[];
  class Area{set value(v){this.text=v}focus(){}dispatchEvent(){}getAttribute(){return null}}
  const editor=new Area();const send={disabled:false,getAttribute:()=>null,click:()=>sent++};
  const answer={innerText:'A borrower receives a loan and agrees to repay it.',querySelector:()=>null};
  const doc={querySelector:s=>s.includes('send-button')?send:null,querySelectorAll:s=>{
    if(s==='button[aria-pressed]')return[];
    if(s.includes('contenteditable'))return[editor];
    if(s.includes('data-conversation-role'))return[];
    return sent||resume||existing?[answer]:[];
  }};
  const chrome={runtime:{id:'test',onMessage:{addListener:f=>handler=f},sendMessage:async msg=>{
    messages.push(msg);if(msg.type==='CHATGPT_RESUME')return{job:resume?{phase:'submitted'}:null};return{ok:true};
  }}};
  vm.runInNewContext(worker,{chrome,document:doc,location:{pathname:resume?'/c/new':'/'},HTMLTextAreaElement:Area,Event:class{},
    Date:{now:()=>{t+=500;return t}},setTimeout:f=>f(),setInterval:()=>1,clearInterval:()=>{}});
  if(!resume){let ack;const returned=handler({type:'CHATGPT_START',prompt:'Explain borrower.'},{id:'test'},v=>ack=v);assert.equal(returned,undefined);assert.equal(ack.accepted,true);}
  await flush();const result=messages.find(x=>x.type==='CHATGPT_RESULT');assert.ok(result,'Final answer must be pushed separately');
  assert.equal(result.ok,!existing);assert.equal(sent,resume||existing?0:1);
}
async function testPanel(action="explain"){
  let handler,storageListener;const requests=[];const docHandlers={},elements={},root={getElementById:id=>elements[id],addEventListener:()=>{}};
  Object.defineProperty(root,'innerHTML',{set:html=>{for(const [,id]of html.matchAll(/id="([^"]+)"/g))elements[id]={textContent:'',hidden:false,disabled:false,style:{},addEventListener(type,f){this[type]=f;}}}});
  const host={style:{},attachShadow:()=>root,getBoundingClientRect:()=>({left:50,top:50,width:360,height:240})};
  const selection={toString:()=> 'borrower',rangeCount:1,getRangeAt:()=>({getBoundingClientRect:()=>({left:50,top:300,bottom:320})})};
  const document={createElement:()=>host,documentElement:{appendChild:()=>{}},activeElement:null,addEventListener:(type,f)=>docHandlers[type]=f};
  const chrome={storage:{local:{get:async x=>x},onChanged:{addListener:f=>storageListener=f}},runtime:{id:'test',onMessage:{addListener:f=>handler=f},sendMessage:async message=>{requests.push(message);return{accepted:true}}}};
  const ctx={chrome,document,window:{getSelection:()=>selection,addEventListener:()=>{}},innerWidth:1000,innerHeight:800,crypto:{randomUUID:()=> 'r1'},setTimeout,clearTimeout,console};
  vm.runInNewContext(content,ctx);const dispatch=msg=>handler(msg,{id:'test'},()=>{});
  dispatch({type:'SHOW_SELECTION_MENU'});assert.equal(requests.length,0,'Selection alone must not call ChatGPT');elements[action].click();await flush();assert.equal(requests[0].action,action);assert.equal(requests[0].type,action==='translate'?'TRANSLATE_SELECTION':'EXPLAIN_SELECTION');if(action==='translate')assert.equal(requests[0].translationLanguage,'Urdu');assert.equal(elements.explain.disabled,true);
  dispatch({type:'EXPLANATION_PARTIAL',requestId:'r1',text:'A borrower receives a loan.',stage:'Receiving…'});
  assert.equal(elements.answer.textContent,'A borrower receives a loan.');
  docHandlers.mouseup({composedPath:()=>[]});assert.equal(host.style.display,'none');
  dispatch({type:'EXPLANATION_RESULT',requestId:'r1',ok:true,text:'A borrower receives a loan and agrees to repay it.'});
  assert.equal(elements.explain.disabled,false);assert.equal(host.style.display,'none');
  dispatch({type:'SHOW_SELECTION_MENU'});assert.equal(elements.result.hidden,false);
  assert.equal(elements.answer.textContent,'A borrower receives a loan and agrees to repay it.');
  if(action==='translate'){
    assert.equal(elements.answer.style.fontSize,'20px');assert.equal(elements['listen-translation'].hidden,false);
    storageListener({translationFontSize:{newValue:24}},'local');assert.equal(elements.answer.style.fontSize,'24px');
    elements['listen-translation'].click();await flush();
    const speech=requests.find(msg=>msg.type==='SPEAK_TRANSLATION');assert.ok(speech);assert.equal(speech.language,'ur');
    assert.equal(speech.text,'A borrower receives a loan and agrees to repay it.');
    dispatch({type:'TRANSLATION_SPEECH_STATUS',speechId:speech.speechId,state:'finished'});
  }
}
await testBackground();await testBackground(true);await testWorker();await testWorker(true);await testWorker(false,true);await testPanel();await testPanel("translate");
console.log('PASS: syntax; immediate request acknowledgements; pushed partial/final answers; background restart; owned-tab cleanup; ChatGPT navigation recovery without resubmission; existing-chat protection; hidden-panel result retention and reopening.');

const source=worker;
for(const mode of ['synchronous throw','promise rejection','runtime getter']){
  let listener,interval,invalid=false,calls=0,cleared=0;
  const runtime={onMessage:{addListener:f=>listener=f},sendMessage:msg=>{
    calls++;
    if(invalid){if(mode==='promise rejection')return Promise.reject(new Error('Extension context invalidated.'));throw new Error('Extension context invalidated.');}
    return Promise.resolve(msg.type==='CHATGPT_RESUME'?{job:{phase:'submitted'}}:{ok:true});
  }};
  Object.defineProperty(runtime,'id',{get(){if(invalid&&mode==='runtime getter')throw new Error('Extension context invalidated.');return'test';}});
  vm.runInNewContext(source,{chrome:{runtime},document:{querySelectorAll:()=>[],querySelector:()=>null},
    Date,setTimeout:()=>1,setInterval:f=>{interval=f;return 10},clearInterval:()=>cleared++});
  await flush();assert.ok(interval);invalid=true;interval();await flush();assert.ok(cleared>0,mode);
  const before=calls;interval();listener({type:'CHATGPT_READY'},{id:'test'},()=>{throw Error('Disposed worker should not respond');});
  await flush();assert.equal(calls,before,mode);
}
// A worker loaded into a context that is already gone must also shut down cleanly.
vm.runInNewContext(source,{chrome:{get runtime(){throw new Error('Extension context invalidated.')}},setTimeout,clearInterval:()=>{}});
await flush();
console.log('PASS: synchronous send failure, rejected message promise, invalid runtime getter, already-invalid startup, stopped heartbeat, and ignored stale callbacks.');

// Regression fixture from the signed-out DOM inspected in a real browser.
async function testObservedGuestLayout(existing=false){
  let handler,sent=0,t=0;const messages=[];
  class GuestArea{set value(v){this.text=v}focus(){}dispatchEvent(){}getAttribute(){return'Chat with ChatGPT'}}
  const editor=new GuestArea();editor.id='mobile-composer-prompt';
  const expected='A borrower receives something temporarily and agrees to return it.';
  const body={innerText:expected,textContent:expected};
  const wrapper={innerText:'ChatGPT said: '+expected+' Copy response',querySelector:s=>s.includes('[data-assistant-markdown]')?body:null};
  const button={disabled:false,getAttribute:()=>null,click:()=>sent++};
  const document={querySelector:s=>s.includes('send-button')?button:(existing&&s.includes('[data-message-role="user"]')?{}:null),
    querySelectorAll:s=>s.includes('textarea#mobile-composer-prompt')?[editor]:(s.includes('[data-message-role="assistant"]')&&sent?[wrapper]:[])};
  const chrome={runtime:{id:'test',onMessage:{addListener:f=>handler=f},sendMessage:async msg=>{messages.push(msg);return msg.type==='CHATGPT_RESUME'?{job:null}:{ok:true}}}};
  vm.runInNewContext(worker,{chrome,document,location:{pathname:'/'},HTMLTextAreaElement:GuestArea,Event:class{},
    Date:{now:()=>{t+=500;return t}},setTimeout:f=>f(),setInterval:()=>1,clearInterval:()=>{}});
  handler({type:'CHATGPT_START',prompt:'Explain borrower.'},{id:'test'},()=>{});await flush();
  const result=messages.find(msg=>msg.type==='CHATGPT_RESULT');assert.ok(result);
  assert.equal(result.ok,!existing);assert.equal(sent,existing?0:1);
  if(!existing)assert.equal(result.text,expected,'Return the actual answer, without attribution or action labels');
}
await testObservedGuestLayout();await testObservedGuestLayout(true);
console.log('PASS: observed signed-out composer, data-message-role answer, data-assistant-markdown body, and guest existing-chat protection.');

console.log("PASS: translation starts only on click and uses its own message route; Urdu default; separate panel results and existing explanation behavior.");

async function testDirectGoogle(language='Urdu',failure=null){
  let handler,fetchCount=0,tabCount=0;const delivered=[];
  const chrome={runtime:{id:'test',onMessage:{addListener:f=>handler=f}},commands:{onCommand:{addListener:()=>{}}},
    alarms:{onAlarm:{addListener:()=>{}}},storage:{session:{get:async()=>({})}},
    tabs:{onRemoved:{addListener:()=>{}},create:async()=>{tabCount++;throw Error('Translation must not create a tab');},
      sendMessage:async(id,msg)=>{assert.equal(id,5);delivered.push(msg);return{received:true}}}};
  const fetch=async(url,options)=>{
    fetchCount++;const u=new URL(url);assert.equal(u.origin,'https://translate.googleapis.com');
    assert.equal(u.searchParams.get('q'),'Hello & world?');assert.equal(u.searchParams.get('tl'),language==='French'?'fr':'ur');
    assert.equal(options.credentials,'omit');
    if(failure==='network')throw new TypeError('Failed to fetch');
    return{ok:failure!=='rate',status:failure==='rate'?429:200,json:async()=>failure==='malformed'?{}:[[['ہیلو ','Hello'],['دنیا','world']],null,'en']};
  };
  vm.runInNewContext(bg,{chrome,fetch,URLSearchParams,AbortController,TypeError,console,setTimeout,clearTimeout,Date});
  let ack;const returned=handler({type:'TRANSLATE_SELECTION',text:'Hello & world?',translationLanguage:language,
    requestId:'translation-1',build:'0.1.5',action:'translate'},{id:'test',tab:{id:5}},v=>ack=v);
  assert.equal(returned,undefined);assert.equal(ack.accepted,true);await flush();
  assert.equal(fetchCount,1);assert.equal(tabCount,0);assert.equal(delivered.length,1);
  assert.equal(delivered[0].type,'EXPLANATION_RESULT');assert.equal(delivered[0].requestId,'translation-1');
  assert.equal(delivered[0].ok,!failure);if(!failure)assert.equal(delivered[0].text,'ہیلو دنیا');
}
await testDirectGoogle();await testDirectGoogle('French');await testDirectGoogle('Urdu','rate');
await testDirectGoogle('Urdu','malformed');await testDirectGoogle('Urdu','network');
console.log('PASS: direct Google URL, encoded selected text, Urdu/French language codes, no credentials, zero tabs, result delivery, rate limiting, malformed data and network failures.');

async function testTranslationAudio(){
  const audioSource=await fs.readFile(dir+'translation-audio.js','utf8');new vm.Script(audioSource);
  let handler;const fetched=[],states=[],audios=[],revoked=[];
  class MockAudio{constructor(url){this.url=url;audios.push(this)}play(){setImmediate(()=>this.onended?.());return Promise.resolve()}pause(){this.paused=true}}
  const chrome={runtime:{id:'test',onMessage:{addListener:f=>handler=f},sendMessage:async msg=>{states.push(msg);return{ok:true}}}};
  const urlApi=class extends URL{};urlApi.createObjectURL=()=> 'blob:test-'+audios.length;urlApi.revokeObjectURL=url=>revoked.push(url);
  vm.runInNewContext(audioSource,{chrome,window:{addEventListener:()=>{}},URL:urlApi,URLSearchParams,AbortController,Audio:MockAudio,
    fetch:async(url,options)=>{fetched.push(url);assert.equal(options.credentials,'omit');return{ok:true,headers:{get:()=> 'audio/mpeg'},blob:async()=>({})}},
    setTimeout,clearTimeout,console});
  let ack;const text='یہ اردو ترجمہ پڑھ کر سنائیں۔ '.repeat(18);
  const returned=handler({target:'translation-audio',type:'PLAY_TRANSLATION_AUDIO',text,language:'ur',speechId:'s1',sourceTabId:5,rate:1.1},
    {id:'test'},v=>ack=v);
  assert.equal(returned,undefined);assert.equal(ack.accepted,true);await flush();
  assert.ok(fetched.length>1);for(const url of fetched){const u=new URL(url);assert.equal(u.origin,'https://translate.google.com');assert.equal(u.searchParams.get('tl'),'ur');assert.ok(Array.from(u.searchParams.get('q')).length<=180);}
  assert.equal(audios.length,fetched.length);assert.equal(audios[0].playbackRate,1.1);assert.equal(states.at(-1).state,'finished');assert.equal(revoked.length,audios.length);
  handler({target:'translation-audio',type:'STOP_TRANSLATION_AUDIO'},{id:'test'},()=>{});
}
async function testAudioRouting(){
  let handler,created=0;const sent=[],notified=[];
  const chrome={runtime:{id:'test',getURL:path=>'chrome-extension://test/'+path,getContexts:async()=>[],
    onMessage:{addListener:f=>handler=f},sendMessage:async msg=>{sent.push(msg);return{accepted:true}},openOptionsPage:async()=>{}},
    offscreen:{createDocument:async spec=>{created++;assert.equal(spec.reasons[0],'AUDIO_PLAYBACK')}},
    commands:{onCommand:{addListener:()=>{}}},alarms:{onAlarm:{addListener:()=>{}}},
    tabs:{onRemoved:{addListener:()=>{}},sendMessage:async(id,msg)=>{notified.push({id,msg});return{received:true}},create:()=>{throw Error('Speech must not create a tab')}}};
  vm.runInNewContext(bg,{chrome,console,setTimeout,clearTimeout,Date});let ack;
  handler({type:'SPEAK_TRANSLATION',text:'ہیلو دنیا',language:'ur',rate:1,speechId:'s1'},{id:'test',tab:{id:5}},v=>ack=v);
  assert.equal(ack.accepted,true);await flush();assert.equal(created,1);assert.equal(sent[0].language,'ur');assert.equal(sent[0].sourceTabId,5);
  handler({type:'TRANSLATION_AUDIO_STATUS',sourceTabId:5,speechId:'s1',state:'playing'},
    {id:'test',url:'chrome-extension://test/translation-audio.html'},()=>{});await flush();
  assert.equal(notified[0].id,5);assert.equal(notified[0].msg.type,'TRANSLATION_SPEECH_STATUS');
}
await testTranslationAudio();await testAudioRouting();
console.log('PASS: Urdu Google audio, Unicode chunk limits, playback rate, audio cleanup, offscreen playback without tabs, and player-to-panel status routing.');

async function testToolbarPopupLaunch(mode){
  const popupScript=await fs.readFile(dir+'popup.js','utf8');new vm.Script(popupScript);
  let click,opened=0;
  const button={disabled:false,addEventListener:(event,fn)=>{assert.equal(event,'click');click=fn;}};
  const status={hidden:true,textContent:''};
  const document={getElementById:id=>id==='settings'?button:status};
  const chrome=mode==='missing-context'?{}:{runtime:{openOptionsPage:async()=>{opened++;if(mode==='failure')throw Error('Simulated launch failure');}}};
  vm.runInNewContext(popupScript,{document,chrome});await click();
  assert.equal(button.disabled,false,'Settings control must recover after completion');
  assert.equal(status.hidden,mode==='success');
  if(mode==='success')assert.equal(opened,1);else assert.ok(status.textContent.includes('Could not open settings'));
}
await testToolbarPopupLaunch('success');await testToolbarPopupLaunch('failure');await testToolbarPopupLaunch('missing-context');
console.log('PASS: toolbar Settings launch, rejected launch promise, missing extension context, visible failure status, and button recovery.');
