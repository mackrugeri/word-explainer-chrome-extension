import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const dir=new URL('../extension/', import.meta.url).pathname;
const bg=(await Promise.all(['review-store.js','context-store.js','context-controller.js','background.js'].map(name=>fs.readFile(dir+name,'utf8')))).join('\n');
const worker=await fs.readFile(dir+'chatgpt-worker.js','utf8');
const content=await fs.readFile(dir+'content.js','utf8');
for(const name of ['background.js','pdf-selection.js','pdf-panel.js','chatgpt-worker.js','chat-cleanup.js','gemini-worker.js','review-panel.js','review-pdf.js','review-export.js','highlighter.js','paragraph-summary.js','review-store.js','context-store.js','context-controller.js','context-graph.js','contexts.js','content.js','options.js','popup.js'])new vm.Script(await fs.readFile(dir+name,'utf8'));
const flush=async()=>{for(let i=0;i<30;i++)await new Promise(setImmediate);};
async function testBackground(restart=false,action="explain",translationLanguage="Urdu",provider="chatgpt"){
  let handler,alarmHandler,removedHandler;const store={},closed=[],notifications=[];let submittedPrompt="",createdUrl="";const prefix=provider.toUpperCase();
  const chrome={runtime:{id:'test',onMessage:{addListener:f=>handler=f}},commands:{onCommand:{addListener:()=>{}}},
    storage:{session:{get:async()=>structuredClone(store),set:async value=>Object.assign(store,structuredClone(value)),remove:async key=>{delete store[key]}}},
    alarms:{create:async()=>{},clear:async()=>{},onAlarm:{addListener:f=>alarmHandler=f}},
    tabs:{onRemoved:{addListener:f=>removedHandler=f},create:async options=>{createdUrl=options.url;return{id:77}},remove:async id=>closed.push(id),sendMessage:async(id,msg)=>{
      if(id===5){notifications.push(msg);return{received:true};}if(msg.type===prefix+'_START')submittedPrompt=msg.prompt;return msg.type===prefix+'_READY'?{ready:true,build:'0.4.4'}:{accepted:true};
    }}};
  const boot=()=>vm.runInNewContext(bg,{chrome,console,setTimeout,clearTimeout,Date});boot();
  let ack;const returned=handler({type:'EXPLAIN_SELECTION',text:'borrower',requestId:'r1',build:'0.4.4',action,translationLanguage,provider},{id:'test',tab:{id:5}},v=>ack=v);
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
async function testPanel(action="explain",provider="chatgpt",hostname="example.com"){
  let handler,storageListener;const requests=[];const docHandlers={},elements={},root={getElementById:id=>elements[id],addEventListener:()=>{}};
  Object.defineProperty(root,'innerHTML',{set:html=>{for(const [,id]of html.matchAll(/id="([^"]+)"/g))elements[id]={textContent:'',hidden:false,disabled:false,style:{},setAttribute(name,value){this[name]=value},addEventListener(type,f){this[type]=f;}}}});
  const host={style:{},attachShadow:()=>root,getBoundingClientRect:()=>({left:50,top:50,width:360,height:240})};
  const selection={toString:()=> 'borrower',rangeCount:1,getRangeAt:()=>({getBoundingClientRect:()=>({left:50,top:300,bottom:320})})};
  const document={createElement:()=>host,documentElement:{appendChild:()=>{}},activeElement:null,addEventListener:(type,f)=>docHandlers[type]=f};
  const chrome={storage:{local:{get:async x=>x},onChanged:{addListener:f=>storageListener=f}},runtime:{id:'test',onMessage:{addListener:f=>handler=f},sendMessage:async message=>{requests.push(message);return{accepted:true}}}};
  const recorded=[];const ctx={WordReviewPanel:{record:record=>recorded.push(record)},location:{hostname,href:`https://${hostname}/`},chrome,document,window:{getSelection:()=>selection,addEventListener:()=>{}},innerWidth:1000,innerHeight:800,crypto:{randomUUID:()=> 'r1'},setTimeout,clearTimeout,console};
  vm.runInNewContext(content,ctx);const dispatch=msg=>handler(msg,{id:'test'},()=>{});
  dispatch({type:'SHOW_SELECTION_MENU'});
  if(hostname==='chatgpt.com'){
    assert.equal(elements['ask-llm'].hidden,true);elements['explain'].click();elements['gemini'].click();
    assert.equal(requests.length,0,'ChatGPT page must never request another AI explanation');
  }
  assert.equal(requests.length,0,'Selection alone must not call ChatGPT');if(action==='explain'){elements['llm-choices'].hidden=true;elements['ask-llm'].click();assert.equal(elements['llm-choices'].hidden,false);assert.equal(requests.length,0,'Opening provider choice must not send a request');}elements[provider==="gemini"?"gemini":action].click();await flush();assert.equal(requests[0].action,action);assert.equal(requests[0].provider,provider);assert.equal(requests[0].type,action==='translate'?'TRANSLATE_SELECTION':'EXPLAIN_SELECTION');if(action==='translate')assert.equal(requests[0].translationLanguage,'Urdu');assert.equal(elements.explain.disabled,true);
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
  if(hostname==='chatgpt.com')return;
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
    requestId:'translation-1',build:'0.4.4',action:'translate'},{id:'test',tab:{id:5}},v=>ack=v);
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
  const document={getElementById:id=>id==='settings'?button:['contexts','pdf-reader'].includes(id)?{addEventListener:()=>{}}:status};
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
const pageA='https://example.com/article',pageB='https://other.example/other';
const note=(text,provider='chatgpt')=>({text,action:'explain',provider,answer:'First sentence. Second sentence. Third sentence.'});
await Promise.all([review.save(pageA,note('one')),review.save(pageA,note('two'))]);
assert.equal((await review.list(pageA)).length,2,'Concurrent writes must not lose concepts');
await review.save(pageA+'#paragraph',note('one','gemini'));
let savedReview=await review.list(pageA);assert.equal(savedReview.length,2);assert.equal(savedReview.find(i=>i.text==='one').notes.length,2);
assert.equal(savedReview[0].notes[0].summary,'First sentence. Second sentence.');
assert.equal((await review.list('https://example.com/next?step=2')).length,2,'Next documentation page must keep previous concepts');
assert.equal((await review.list('https://docs.example.com/article')).length,0,'Different subdomains stay isolated');
assert.equal((await review.list(pageB)).length,0,'Different sites must stay isolated');
await review.save(pageB,{text:'one',action:'translate',language:'Urdu',answer:'پہلا جملہ۔ دوسرا جملہ۔ تیسرا جملہ۔'});
assert.equal((await review.list(pageB))[0].notes[0].summary,'پہلا جملہ۔ دوسرا جملہ۔');
review=reviewContext.WordReviewStore.create(reviewStorage);assert.equal((await review.list(pageA)).length,2,'Reload must retain review');
await review.clear(pageA);assert.equal((await review.list(pageA)).length,0);assert.equal((await review.list(pageB)).length,1);
await assert.rejects(review.save(pageA,{text:'bad',action:'listen',answer:'Not an explanation'}));
for(let i=0;i<45;i++)await review.save(pageA,note('concept '+i));
assert.equal((await review.list(pageA)).length,40);
for(let i=0;i<22;i++)await review.save('https://site'+i+'.example/article',note('one'));
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
  elements.toggle.click({detail:0});await flush();
  location.href='https://example.com/next?step=2';timer();await flush();assert.equal(elements.panel.hidden,false,'Same-site Next navigation must preserve the open review');
  location.href=pageB;timer();await flush();assert.equal(elements.panel.hidden,true);
  const before=requests.length;await context.WordReviewPanel.record({pageUrl:pageA,...note('old result')});assert.equal(requests.length,before,'Late result from a prior page must not be saved on the new page');
}
await testReviewPanel();
console.log('PASS: local page review, serialized writes, provider deduplication, English/Urdu two-sentence excerpts, persistence, clear-page isolation, retention bounds, inert text rendering, collapsed badge updates, and SPA page separation.');

await testPanel("translate","chatgpt","chatgpt.com");
console.log("PASS: ChatGPT selection shortcut UI exposes translation and pronunciation only; AI actions are blocked; translation and audio still work.");

// Cross-page context service and source-grounded summary lifecycle.
const contextSource=await fs.readFile(dir+'context-store.js','utf8');
const contextScope={URL};vm.runInNewContext(contextSource,contextScope);
const contextData={};const local={get:async()=>structuredClone(contextData),set:async value=>Object.assign(contextData,structuredClone(value))};let idCount=0;
let contextsStore=contextScope.WordContextStore.create(local,()=>`id-${++idCount}`);
const topic=await contextsStore.create('Fine-tuning');await assert.rejects(contextsStore.create('fine-TUNING'));
const sourceRecord=(text,url='https://example.com/a')=>({text,url,title:'Research source'});
await Promise.all([contextsStore.add(topic.id,sourceRecord('One technique.')),contextsStore.add(topic.id,sourceRecord('Another technique.','https://example.org/b'))]);
let topicNow=(await contextsStore.list())[0];assert.equal(topicNow.quotes.length,2,'Concurrent captures must retain both excerpts');
const revision=topicNow.revision;await contextsStore.add(topic.id,sourceRecord('One technique.'));assert.equal((await contextsStore.list())[0].revision,revision);
await contextsStore.link(topic.id,topicNow.quotes[0].id,topicNow.quotes[1].id,'An alternative approach');
await assert.rejects(contextsStore.link(topic.id,topicNow.quotes[0].id,topicNow.quotes[0].id,''));
const prepared=await contextsStore.prepare(topic.id);assert.equal(prepared.sources.length,2);assert.ok(prepared.prompt.includes('An alternative approach'));assert.ok(prepared.prompt.includes('https://example.org/b'));
await contextsStore.saveSummary(topic.id,prepared,'The techniques differ [1][2].','gemini');
await contextsStore.add(topic.id,sourceRecord('Third idea.','https://example.net/c'));topicNow=(await contextsStore.list())[0];assert.notEqual(topicNow.summary.revision,topicNow.revision,'New evidence marks the saved summary outdated');
contextsStore=contextScope.WordContextStore.create(local,()=>`id-${++idCount}`);assert.equal((await contextsStore.list())[0].quotes.length,3,'Context persists after service restart');
await contextsStore.remove(topic.id,topicNow.quotes[0].id);assert.equal((await contextsStore.list())[0].links.length,0,'Removing an excerpt removes dangling links');
await assert.rejects(contextsStore.add(topic.id,sourceRecord('x','javascript:alert(1)')));
await assert.rejects(contextsStore.add(topic.id,sourceRecord('x'.repeat(8001))));
const large=await contextsStore.create('Large');for(let i=0;i<4;i++)await contextsStore.add(large.id,sourceRecord('x'.repeat(7998)+i));
await assert.rejects(contextsStore.prepare(large.id),/too long/,'Oversized context must fail explicitly, never silently truncate');

async function testContextBackground(provider='gemini',cleanupOutcome=null){
  const saved={},session={},opened=[],broadcasts=[],closed=[];let handler,preparedPrompt;
  const chrome={runtime:{id:'test',getURL:name=>'chrome-extension://test/'+name,onMessage:{addListener:fn=>handler=fn},sendMessage:async msg=>{broadcasts.push(msg);return{ok:true}}},
    storage:{local:{get:async()=>structuredClone(saved),set:async value=>Object.assign(saved,structuredClone(value))},session:{get:async()=>structuredClone(session),set:async value=>Object.assign(session,structuredClone(value)),remove:async key=>delete session[key]}},
    commands:{onCommand:{addListener:()=>{}}},alarms:{create:async()=>{},clear:async()=>{},onAlarm:{addListener:()=>{}}},
    tabs:{create:async spec=>{opened.push(spec);return{id:77}},remove:async tabId=>closed.push(tabId),onRemoved:{addListener:()=>{}},sendMessage:async(id,msg)=>{
      if(msg.type.endsWith('_CLEANUP')){assert.ok(saved.wordContextsV1[0].summary,'Summary must be saved before chat deletion');return{deleted:cleanupOutcome==='success',error:cleanupOutcome==='failure'?'The generated chat was not found in Recents.':undefined}}
      if(msg.type.endsWith('_READY'))return{ready:true,build:'0.4.4'};
      if(msg.type.endsWith('_START')){preparedPrompt=msg;return{accepted:true}}return{};
    }}};
  let count=0;
  const boot=()=>vm.runInNewContext(bg,{chrome,URL,crypto:{randomUUID:()=>`ctx-${++count}`},console,Date,setTimeout,clearTimeout});boot();
  const source={id:'test',url:'https://example.com/a',tab:{id:5,url:'https://example.com/a'}};
  const ui={id:'test',url:'chrome-extension://test/contexts.html',tab:{id:9,url:'chrome-extension://test/contexts.html'}};
  async function request(message,sender=ui){let response;const returned=handler(message,sender,value=>response=value);await flush();assert.ok(response,'Request must reply');return{response,returned};}
  let value=await request({type:'CONTEXT_LIST'},source);assert.equal(value.response.ok,false,'Web pages cannot inspect saved research collections');
  const created=await request({type:'CONTEXT_CREATE',name:'Study'});const contextId=created.response.context.id;
  await request({type:'OPEN_CONTEXTS',text:'First paragraph',title:'Source A'},source);
  assert.ok(opened.at(-1).url.includes('contexts.html?draft='));
  const draftId=new URL(opened.at(-1).url).searchParams.get('draft');
  await request({type:'CONTEXT_ADD',contextId,draftId});
  await request({type:'OPEN_CONTEXTS',text:'Second paragraph',title:'Source B'},{...source,tab:{id:6,url:'https://example.org/b'}});
  const secondDraft=new URL(opened.at(-1).url).searchParams.get('draft');await request({type:'CONTEXT_ADD',contextId,draftId:secondDraft});
  const listing=await request({type:'CONTEXT_LIST'});
  const quoteId=listing.response.contexts[0].quotes[0].id;
  const moved=await request({type:'CONTEXT_MOVE',contextId,quoteId,position:{x:120,y:180}});
  assert.equal(moved.response.context.layout[quoteId].x,120);
  const summary=await request({type:'CONTEXT_SUMMARIZE',contextId,provider,requestId:'summary-1'});
  assert.equal(summary.returned,undefined);assert.equal(summary.response.accepted,true,'Summary is acknowledged before model generation');
  assert.equal(preparedPrompt.task,'context-summary');assert.ok(preparedPrompt.prompt.includes('First paragraph'));assert.ok(preparedPrompt.prompt.includes('Second paragraph'));
  boot();
  await request({type:provider.toUpperCase()+'_RESULT',ok:true,text:'The two paragraphs connect [1][2].',cleanupPath:cleanupOutcome?(provider==='gemini'?'/app/owned-chat':'/c/owned-chat'):undefined},{id:'test',tab:{id:77}});
  assert.equal(saved.wordContextsV1[0].summary.text,'The two paragraphs connect [1][2].');assert.equal(saved.wordContextsV1[0].summary.provider,provider);
  assert.equal(broadcasts.at(-1).type,'CONTEXT_SUMMARY_RESULT');assert.equal(broadcasts.at(-1).ok,true);assert.deepEqual(closed,cleanupOutcome==='failure'?[]:[77]);if(cleanupOutcome==='failure')assert.ok(broadcasts.at(-1).warning.includes('left open'));
  assert.equal(session.activeExplanationJob,undefined);
  const firstCapture=await request({type:'CONTEXT_CREATE',name:'Initial selection',draftId:secondDraft});
  assert.equal(firstCapture.response.captured,true);assert.equal(firstCapture.response.context.quotes.length,1);
  assert.equal(firstCapture.response.context.quotes[0].url,'https://example.org/b');
  const refused=await request({type:'CONTEXT_DELETE',contextId:firstCapture.response.context.id,confirmation:'wrong'});
  assert.equal(refused.response.ok,false);
  const deleted=await request({type:'CONTEXT_DELETE',contextId:firstCapture.response.context.id,confirmation:'Initial selection'});
  assert.equal(deleted.response.ok,true);assert.equal((await request({type:'CONTEXT_LIST'})).response.contexts.length,1);
}
await testContextBackground('gemini');await testContextBackground('chatgpt');
console.log('PASS: named cross-page contexts, concurrent capture, source URLs, deduplication, explicit links, reload persistence, stale summaries, reference snapshots, length limits, trusted-UI boundary, both providers, summary restart recovery, and owned-tab cleanup.');

const cleanupScript=await fs.readFile(dir+'chat-cleanup.js','utf8');
async function testExactChatCleanup(mode='success',provider='chatgpt'){
  const prefix=provider==='gemini'?'/app/':'/c/';const hostName=provider==='gemini'?'gemini.google.com':'chatgpt.com';
  let phase=0,clicks=0,t=0;
  const location={hostname:hostName,origin:'https://'+hostName,pathname:prefix+'owned-chat',href:'https://'+hostName+prefix+'owned-chat'};
  const visible={getClientRects:()=>[{}],disabled:false};
  const anchor={href:location.href,getAttribute:()=>prefix+'owned-chat'};
  const menu={...visible,focus:()=>{},dispatchEvent:event=>{if(['pointer-menu','double-toggle-menu'].includes(mode)&&event.type==='pointerdown')phase=1;return true},click:()=>{if(mode==='double-toggle-menu')phase=phase===1?0:1;else if(mode!=='pointer-menu')phase=1;clicks++}};
  const option={...visible,textContent:'Delete',click:()=>{phase=2;clicks++}};
  const wrapper={...visible,textContent:'Delete',closest:()=>wrapper};
  const portal={...visible,querySelectorAll:()=>[wrapper,option]};
  if(mode==='nested-delete'){option.closest=()=>wrapper;option.tagName='BUTTON';}
  if(mode==='shortcut-delete')option.textContent='Delete ⌘⌫';
  const confirm={...visible,textContent:'Delete',click:()=>{phase=3;clicks++;location.pathname='/'}};
  const dialog={...visible,textContent:'Delete this chat?',querySelectorAll:()=>[confirm]};
  const row={parentElement:null,querySelectorAll:()=>[anchor],querySelector:()=>menu};anchor.parentElement=row;
  const document={querySelectorAll:selector=>{
    if((selector.includes('data-message')||selector.includes('user-query')))return[{getAttribute:key=>mode==='role-heading'&&key==='data-conversation-role'?'user':null,parentElement:mode==='role-heading'?{innerText:'You said Explain borrower.',querySelectorAll:()=>[{innerText:'Explain borrower.'}]}:null,innerText:mode==='role-heading'?'You said':mode==='gemini-a11y-label'?'You said Explain borrower. Explain borrower.':mode==='wrong-prompt'?'A personal conversation':mode==='decorated-prompt'?'You said Explain borrower.':'Explain borrower.',querySelectorAll:selector=>mode==='decorated-prompt'?[{innerText:'Explain borrower.'}]:mode==='gemini-a11y-label'&&selector==='.query-text-line'?[{textContent:'Explain'},{textContent:'borrower.'}]:[]}];
    if(selector==='a[href]')return mode==='missing-row'||phase===3?[]:mode==='with-skip-link'?[{href:location.href+'#skip',parentElement:null},anchor]:[anchor];
    if(selector==='[role="menu"], [data-radix-menu-content]')return mode==='nested-delete'&&phase===1?[portal]:[];
    if(selector==='[role="menuitem"]')return phase===1?(mode==='ambiguous-menu'?[option,{...option}]:[option]):[];
    if(selector.includes('alertdialog'))return phase===2?[dialog]:[];
    return[];
  }};
  const scope={URL,document,location,PointerEvent:class{constructor(type,options){this.type=type;Object.assign(this,options)}},MouseEvent:class{constructor(type,options){this.type=type;Object.assign(this,options)}},Date:{now:()=>{t+=200;return t}},setTimeout:fn=>fn()};vm.runInNewContext(cleanupScript,scope);
  const result=await scope.WordChatCleanup.remove(prefix+(mode==='wrong-path'?'other-chat':'owned-chat'),'Explain borrower.');
  assert.equal(result.deleted,['success','decorated-prompt','role-heading','with-skip-link','pointer-menu','double-toggle-menu','nested-delete','shortcut-delete','gemini-a11y-label'].includes(mode));assert.equal(clicks,['success','decorated-prompt','role-heading','with-skip-link','pointer-menu','double-toggle-menu','nested-delete','shortcut-delete','gemini-a11y-label'].includes(mode)?(['pointer-menu','double-toggle-menu'].includes(mode)?2:3):mode==='ambiguous-menu'?1:0);
}
for(const mode of ['success','wrong-path','wrong-prompt','missing-row','ambiguous-menu'])await testExactChatCleanup(mode);
console.log('PASS: exact ChatGPT conversation deletion, prompt matching, wrong-chat refusal, missing-row refusal, and ambiguous-menu refusal.');

await testContextBackground('chatgpt','success');await testContextBackground('chatgpt','failure');

for(const mode of ['success','wrong-path','wrong-prompt','missing-row','ambiguous-menu'])await testExactChatCleanup(mode,'gemini');
await testContextBackground('gemini','success');await testContextBackground('gemini','failure');
console.log('PASS: Gemini exact-conversation cleanup, wrong-chat safeguards, saved answer before deletion, and visible cleanup failure.');

await testExactChatCleanup('decorated-prompt');await testExactChatCleanup('decorated-prompt','gemini');

await testExactChatCleanup('role-heading');

await testExactChatCleanup('with-skip-link');await testExactChatCleanup('with-skip-link','gemini');

await testExactChatCleanup('pointer-menu');await testExactChatCleanup('double-toggle-menu');await testExactChatCleanup('nested-delete');await testExactChatCleanup('shortcut-delete');

await testExactChatCleanup('gemini-a11y-label','gemini');

await import('./test-context-graph.mjs');

await import('./test-summary-cleanup-ui.mjs');

await import('./test-selection-support.mjs');

await import('./test-pdf-actions.mjs');

await import('./test-site-review.mjs');

await import('./test-review-export.mjs');

await import('./test-paragraph-summary.mjs');
