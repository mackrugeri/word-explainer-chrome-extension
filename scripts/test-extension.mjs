import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const dir=new URL('../extension/', import.meta.url).pathname;
const bg=(await fs.readFile(dir+'review-store.js','utf8'))+'\n'+(await fs.readFile(dir+'background.js','utf8'));
const worker=await fs.readFile(dir+'chatgpt-worker.js','utf8');
const content=await fs.readFile(dir+'content.js','utf8');
for(const name of ['background.js','chatgpt-worker.js','gemini-worker.js','review-panel.js','review-store.js','content.js','options.js','popup.js'])new vm.Script(await fs.readFile(dir+name,'utf8'));
const flush=async()=>{for(let i=0;i<30;i++)await new Promise(setImmediate);};
async function testBackground(restart=false,action="explain",translationLanguage="Urdu",provider="chatgpt"){
  let handler,alarmHandler,removedHandler;const store={},closed=[],notifications=[];let submittedPrompt="",createdUrl="";const prefix=provider.toUpperCase();
  const chrome={runtime:{id:'test',onMessage:{addListener:f=>handler=f}},commands:{onCommand:{addListener:()=>{}}},
    storage:{session:{get:async()=>structuredClone(store),set:async value=>Object.assign(store,structuredClone(value)),remove:async key=>{delete store[key]}}},
    alarms:{create:async()=>{},clear:async()=>{},onAlarm:{addListener:f=>alarmHandler=f}},
    tabs:{onRemoved:{addListener:f=>removedHandler=f},create:async options=>{createdUrl=options.url;return{id:77}},remove:async id=>closed.push(id),sendMessage:async(id,msg)=>{
      if(id===5){notifications.push(msg);return{received:true};}if(msg.type===prefix+'_START')submittedPrompt=msg.prompt;return msg.type===prefix+'_READY'?{ready:true,build:'0.1.9'}:{accepted:true};
    }}};
  const boot=()=>vm.runInNewContext(bg,{chrome,console,setTimeout,clearTimeout,Date});boot();
  let ack;const returned=handler({type:'EXPLAIN_SELECTION',text:'borrower',requestId:'r1',build:'0.1.9',action,translationLanguage,provider},{id:'test',tab:{id:5}},v=>ack=v);
  assert.equal(returned,undefined);assert.equal(ack.accepted,true);await flush();assert.equal(store.activeExplanationJob.tabId,77);if(action==='translate'){assert.ok(submittedPrompt.startsWith('Translate'));assert.ok(submittedPrompt.includes('into '+translationLanguage));assert.ok(submittedPrompt.includes('only the translation'));}else assert.ok(submittedPrompt.startsWith('Explain'));
  assert.equal(createdUrl,provider==="gemini"?"https://gemini.google.com/app":"https://chatgpt.com/");
  if(restart)boot();
  handler({type:prefix+'_PARTIAL',text:'A borrower receives a loan.'},{id:'test',tab:{id:77}},()=>{});await flush();
  assert.equal(notifications.at(-1).type,'EXPLANATION_PARTIAL');
  handler({type:prefix+'_RESULT',ok:true,text:'A borrower receives a loan and agrees to repay it.'},{id:'test',tab:{id:77}},()=>{});await flush();
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
async function testPanel(action="explain",provider="chatgpt"){
  let handler,storageListener;const requests=[];const docHandlers={},elements={},root={getElementById:id=>elements[id],addEventListener:()=>{}};
  Object.defineProperty(root,'innerHTML',{set:html=>{for(const [,id]of html.matchAll(/id="([^"]+)"/g))elements[id]={textContent:'',hidden:false,disabled:false,style:{},setAttribute(name,value){this[name]=value},addEventListener(type,f){this[type]=f;}}}});
  const host={style:{},attachShadow:()=>root,getBoundingClientRect:()=>({left:50,top:50,width:360,height:240})};
  const selection={toString:()=> 'borrower',rangeCount:1,getRangeAt:()=>({getBoundingClientRect:()=>({left:50,top:300,bottom:320})})};
  const document={createElement:()=>host,documentElement:{appendChild:()=>{}},activeElement:null,addEventListener:(type,f)=>docHandlers[type]=f};
  const chrome={storage:{local:{get:async x=>x},onChanged:{addListener:f=>storageListener=f}},runtime:{id:'test',onMessage:{addListener:f=>handler=f},sendMessage:async message=>{requests.push(message);return{accepted:true}}}};
  const recorded=[];const ctx={WordReviewPanel:{record:record=>recorded.push(record)},chrome,document,window:{getSelection:()=>selection,addEventListener:()=>{}},innerWidth:1000,innerHeight:800,crypto:{randomUUID:()=> 'r1'},setTimeout,clearTimeout,console};
  vm.runInNewContext(content,ctx);const dispatch=msg=>handler(msg,{id:'test'},()=>{});
  dispatch({type:'SHOW_SELECTION_MENU'});assert.equal(requests.length,0,'Selection alone must not call ChatGPT');if(action==='explain'){elements['llm-choices'].hidden=true;elements['ask-llm'].click();assert.equal(elements['llm-choices'].hidden,false);assert.equal(requests.length,0,'Opening provider choice must not send a request');}elements[provider==="gemini"?"gemini":action].click();await flush();assert.equal(requests[0].action,action);assert.equal(requests[0].provider,provider);assert.equal(requests[0].type,action==='translate'?'TRANSLATE_SELECTION':'EXPLAIN_SELECTION');if(action==='translate')assert.equal(requests[0].translationLanguage,'Urdu');assert.equal(elements.explain.disabled,true);
  dispatch({type:'EXPLANATION_PARTIAL',requestId:'r1',text:'A borrower receives a loan.',stage:'Receiving…'});
  assert.equal(elements[action==='translate'?'translation-answer':'answer'].textContent,'A borrower receives a loan.');
  docHandlers.mouseup({composedPath:()=>[]});assert.equal(host.style.display,'none');
  dispatch({type:'EXPLANATION_RESULT',requestId:'r1',ok:true,text:'A borrower receives a loan and agrees to repay it.'});
  assert.equal(elements.explain.disabled,false);assert.equal(host.style.display,'none');
  dispatch({type:'SHOW_SELECTION_MENU'});assert.equal(elements[action==='translate'?'translation-result':'result'].hidden,false);
  assert.equal(elements[action==='translate'?'translation-answer':'answer'].textContent,'A borrower receives a loan and agrees to repay it.');
  if(action==='translate'){
    assert.equal(elements[action==='translate'?'translation-answer':'answer'].style.fontSize,'20px');assert.equal(elements['listen-translation'].hidden,false);
    storageListener({translationFontSize:{newValue:24}},'local');assert.equal(elements[action==='translate'?'translation-answer':'answer'].style.fontSize,'24px');
    elements['listen-translation'].click();await flush();
    const speech=requests.find(msg=>msg.type==='SPEAK_TRANSLATION');assert.ok(speech);assert.equal(speech.language,'ur');
    assert.equal(speech.text,'A borrower receives a loan and agrees to repay it.');
    dispatch({type:'TRANSLATION_SPEECH_STATUS',speechId:speech.speechId,state:'finished'});
  }
  const previous=elements[action==='translate'?'translation-answer':'answer'].textContent;
  const other=action==='translate'?'explain':'translate';
  elements[other].click();await flush();
  assert.equal(elements[action==='translate'?'translation-answer':'answer'].textContent,previous,'Other section must retain its answer during loading');
  assert.equal(elements[action==='translate'?'translation-result':'result'].open,false,'Previous section collapses');
  assert.equal(elements[other==='translate'?'translation-result':'result'].open,true,'Latest section expands');
  dispatch({type:'EXPLANATION_RESULT',requestId:'r1',ok:true,text:'Second independent answer'});
  assert.equal(elements[action==='translate'?'translation-answer':'answer'].textContent,previous);
  assert.equal(elements[other==='translate'?'translation-answer':'answer'].textContent,'Second independent answer');
  assert.equal(elements.result.hidden,false);assert.equal(elements['translation-result'].hidden,false);
  docHandlers.mouseup({composedPath:()=>[]});dispatch({type:'SHOW_SELECTION_MENU'});
  assert.equal(elements.result.hidden,false);assert.equal(elements['translation-result'].hidden,false,'Both sections restore on reopen');
  assert.equal(recorded.length,2,'Each successful completed answer is recorded once');assert.ok(recorded.every(record=>record.answer&&record.text==='borrower'));
  let captured=false;
  elements['drag-handle'].setPointerCapture=()=>captured=true;
  elements['drag-handle'].pointerdown({button:0,pointerId:1,clientX:50,clientY:50,target:{closest:()=>null},preventDefault:()=>{}});
  elements['drag-handle'].pointermove({pointerId:1,clientX:100,clientY:100});
  assert.equal(captured,true,'Header drag captures the pointer');
  elements['drag-handle'].pointerup();

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
    requestId:'translation-1',build:'0.1.9',action:'translate'},{id:'test',tab:{id:5}},v=>ack=v);
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
    storage:{local:{}},offscreen:{createDocument:async spec=>{created++;assert.equal(spec.reasons[0],'AUDIO_PLAYBACK')}},
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

await testBackground(false,"explain","Urdu","gemini");
await testBackground(true,"explain","Urdu","gemini");
await testPanel("explain","gemini");
const geminiWorker=await fs.readFile(dir+'gemini-worker.js','utf8');
async function testGeminiWorker(resume=false,existing=false){
  let handler,sent=0,t=0;const messages=[];
  class Area{set value(v){this.text=v}focus(){}dispatchEvent(){}getAttribute(){return null}}
  const editor=new Area(); const send={disabled:false,getAttribute:()=>null,click:()=>sent++};
  const answer={innerText:'A borrower takes a loan and repays it.'};
  const doc={querySelector:s=>s.includes('contenteditable')?editor:s.includes('Send message')?send:null,
    querySelectorAll:()=>sent||resume||existing?[answer]:[]};
  const runtime={id:'test',onMessage:{addListener:f=>handler=f},sendMessage:async msg=>{
    messages.push(msg);return msg.type==='GEMINI_RESUME'?{job:resume?{phase:'submitted'}:null}:{ok:true};
  }};
  vm.runInNewContext(geminiWorker,{chrome:{runtime},document:doc,location:{pathname:resume?'/app/answer':'/app'},
    HTMLTextAreaElement:Area,Event:class{},Date:{now:()=>{t+=500;return t}},setTimeout:f=>f(),setInterval:()=>1,clearInterval:()=>{}});
  if(!resume){let ack;assert.equal(handler({type:'GEMINI_START',prompt:'Explain borrower.'},{id:'test'},v=>ack=v),undefined);assert.equal(ack.accepted,true);}
  await flush();const result=messages.find(m=>m.type==='GEMINI_RESULT');assert.ok(result);assert.equal(result.ok,!existing);
  assert.equal(sent,resume||existing?0:1);if(result.ok)assert.equal(result.text,answer.innerText);
}
await testGeminiWorker();await testGeminiWorker(true);await testGeminiWorker(false,true);
console.log('PASS: Gemini provider routing, restart, owned-tab cleanup, panel choice, observed editor/answer structure, resume without resend, and existing-chat protection.');

// Per-page review data service: serialization, bounds, deduplication, and local persistence.
const reviewSource=await fs.readFile(dir+'review-store.js','utf8');
const reviewContext={URL}; vm.runInNewContext(reviewSource,reviewContext);
const reviewData={}; const reviewStorage={get:async()=>structuredClone(reviewData),set:async value=>Object.assign(reviewData,structuredClone(value))};
let review=reviewContext.WordReviewStore.create(reviewStorage);
const pageA='https://example.com/article',pageB='https://example.com/other';
const note=(text,provider='chatgpt')=>({text,action:'explain',provider,answer:'First sentence. Second sentence. Third sentence.'});
await Promise.all([review.save(pageA,note('one')),review.save(pageA,note('two'))]);
assert.equal((await review.list(pageA)).length,2,'Concurrent writes must not lose concepts');
await review.save(pageA+'#paragraph',note('one','gemini'));
let savedReview=await review.list(pageA);assert.equal(savedReview.length,2);assert.equal(savedReview.find(i=>i.text==='one').notes.length,2);
assert.equal(savedReview[0].notes[0].summary,'First sentence. Second sentence.');
assert.equal((await review.list(pageB)).length,0,'Different pages must stay isolated');
await review.save(pageB,{text:'one',action:'translate',language:'Urdu',answer:'پہلا جملہ۔ دوسرا جملہ۔ تیسرا جملہ۔'});
assert.equal((await review.list(pageB))[0].notes[0].summary,'پہلا جملہ۔ دوسرا جملہ۔');
review=reviewContext.WordReviewStore.create(reviewStorage);assert.equal((await review.list(pageA)).length,2,'Reload must retain review');
await review.clear(pageA);assert.equal((await review.list(pageA)).length,0);assert.equal((await review.list(pageB)).length,1);
await assert.rejects(review.save(pageA,{text:'bad',action:'listen',answer:'Not an explanation'}));
for(let i=0;i<45;i++)await review.save(pageA,note('concept '+i));
assert.equal((await review.list(pageA)).length,40);
for(let i=0;i<22;i++)await review.save('https://example.com/'+i,note('one'));
assert.equal(reviewData.wordReviewPagesV1.length,20);
assert.ok(reviewContext.WordReviewStore.excerpt('x'.repeat(400)).length<=240);

// UI never auto-opens, survives selection popup closure, and resets on SPA navigation.
const reviewPanelSource=await fs.readFile(dir+'review-panel.js','utf8');
async function testReviewPanel(){
  const elements={},requests=[];let timer,seq=0;
  const node=()=>({style:{},children:[],hidden:false,textContent:'',setAttribute(name,value){this[name]=value},
    getBoundingClientRect(){return{left:100,top:16,right:220,bottom:52,width:120,height:36}},setPointerCapture(){},appendChild(child){this.children.push(child)},replaceChildren(){this.children=[]},focus(){},addEventListener(type,fn){this[type]=fn}});
  const root={getElementById:id=>elements[id],addEventListener:()=>{}};
  Object.defineProperty(root,'innerHTML',{set:html=>{for(const [,id]of html.matchAll(/id="([^"]+)"/g))elements[id]=node();elements.panel.hidden=true}});
  const host=node();host.attachShadow=()=>root;const location={href:pageA};
  const api={runtime:{sendMessage:async msg=>{requests.push(msg);return{ok:true,items:msg.type==='REVIEW_SAVE'?[{text:msg.record.text,notes:[{action:'explain',provider:'gemini',summary:'A recap.'}]}]:[]}}}};
  const context={chrome:api,URL,location,innerWidth:1000,innerHeight:700,document:{createElement:tag=>tag==='div'&&seq++===0?host:node(),documentElement:{appendChild:()=>{}}},window:{addEventListener:()=>{}},setInterval:fn=>{timer=fn;return 1},clearInterval:()=>{}};
  vm.runInNewContext(reviewPanelSource,context);await flush();
  assert.equal(elements.toggle.hidden,true,'Review badge stays hidden until a completed answer is saved');
  await context.WordReviewPanel.record({pageUrl:pageA,...note('<img src=x onerror=bad>')});
  assert.equal(elements.count.textContent,'1');assert.equal(elements.toggle.hidden,false,'A saved answer reveals the badge');assert.equal(elements.panel.hidden,true,'New results must not auto-expand review');
  assert.equal(elements.items.children[0].children[0].textContent,'<img src=x onerror=bad>','Saved text must render as text, never HTML');
  // Keep the mocked backend consistent for an explicit open/reload.
  api.runtime.sendMessage=async msg=>({ok:true,items:[{text:'one',notes:[]}]});
  elements.toggle.click();await flush();assert.equal(elements.panel.hidden,false);
  elements.toggle.pointerdown({button:0,pointerId:1,clientX:100,clientY:16});
  elements.toggle.pointermove({pointerId:1,clientX:200,clientY:116,preventDefault:()=>{}});
  elements.toggle.pointerup({pointerId:1});
  assert.equal(host.style.left,'200px');assert.equal(host.style.top,'116px');
  elements.toggle.click({detail:1});assert.equal(elements.panel.hidden,false,'Drag must not toggle the panel');
  elements.toggle.click({detail:0});assert.equal(elements.panel.hidden,true,'Keyboard activation still works');
  elements.toggle.pointerdown({button:0,pointerId:2,clientX:100,clientY:16});
  elements.toggle.pointermove({pointerId:2,clientX:-10000,clientY:-10000,preventDefault:()=>{}});
  elements.toggle.pointercancel({pointerId:2});assert.equal(host.style.left,'8px');assert.equal(host.style.top,'8px');
  location.href=pageB;timer();await flush();assert.equal(elements.panel.hidden,true);
  const before=requests.length;await context.WordReviewPanel.record({pageUrl:pageA,...note('old result')});assert.equal(requests.length,before,'Late result from a prior page must not be saved on the new page');
}
await testReviewPanel();
console.log('PASS: local page review, serialized writes, provider deduplication, English/Urdu two-sentence excerpts, persistence, clear-page isolation, retention bounds, inert text rendering, collapsed badge updates, and SPA page separation.');
