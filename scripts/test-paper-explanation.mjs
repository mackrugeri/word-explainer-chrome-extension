import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const dir=new URL('../extension/',import.meta.url).pathname;
const code=await fs.readFile(dir+'pdf-selection.js','utf8');
new vm.Script(await fs.readFile(dir+'pdf-panel.js','utf8'));
let clicked,installed,removed,updated;const store={},order=[],started=[],translated=[],warnings=[],captured=[];
const chrome={runtime:{id:'test',getURL:path=>'chrome-extension://test/'+path,onInstalled:{addListener:f=>installed=f},onStartup:{addListener(){}},lastError:null},contextMenus:{remove(id,fn){fn()},create(properties,fn){assert.equal(properties.contexts[0],'selection');fn()},onClicked:{addListener:f=>clicked=f}},sidePanel:{open:async opts=>{order.push(['open',opts.tabId])}},storage:{session:{get:async key=>{order.push(['get',key]);return structuredClone(store)},set:async obj=>Object.assign(store,structuredClone(obj)),remove:async key=>delete store[key]}},tabs:{get:async id=>({id}),onRemoved:{addListener:f=>removed=f},onUpdated:{addListener:f=>updated=f}}};
let serial=0;const ctx={chrome,URL,crypto:{randomUUID:()=>`selection-${++serial}`}};vm.runInNewContext(await fs.readFile(dir+'paper-explanation.js','utf8'),ctx);vm.runInNewContext(code,ctx);
const make=()=>ctx.WordPDFSelection.create({chrome,translate:async(...args)=>{translated.push(args);return 'ترجمہ'},start:async(...args)=>{started.push(args)},feedback:(...args)=>warnings.push(args),capture:async record=>{captured.push(structuredClone(record));return {ok:true}}});
let service=make();installed();
const flush=async()=>{for(let i=0;i<20;i++)await new Promise(setImmediate)};
const panel={id:'test',url:'chrome-extension://test/pdf-panel.html'};
const send=(message,sender=panel)=>new Promise(resolve=>service.handle(message,sender,resolve));
clicked({menuItemId:'word-pdf-selection',selectionText:' alpha + beta ',pageUrl:'https://example.org/download?id=1'},{id:5});
assert.equal(order[0][0],'open','The panel must open before any await loses the menu user gesture');await flush();
let record=(await send({type:'PDF_PANEL_GET',tabId:5})).record;assert.equal(record.text,'alpha + beta');assert.equal((await send({type:'PDF_PANEL_CONTEXT',tabId:5,selectionId:record.id})).ok,true);assert.equal(captured[0].url,'https://example.org/download?id=1');assert.equal(captured[0].text,'alpha + beta');assert.equal((await send({type:'PDF_PANEL_CONTEXT',tabId:5,selectionId:'outdated'})).ok,false);assert.equal(translated.length,0);assert.equal(started.length,0,'Opening does not send text externally');
assert.equal((await send({type:'PDF_PANEL_RUN',tabId:5,selectionId:record.id,action:'translate',provider:'chatgpt',language:'Urdu',requestId:'translate-123'})).accepted,true);await flush();
record=(await send({type:'PDF_PANEL_GET',tabId:5})).record;assert.equal(record.results.translate.text,'ترجمہ');
assert.equal((await send({type:'PDF_PANEL_RUN',tabId:5,selectionId:record.id,action:'paper-explanation',provider:'gemini',language:'Urdu',requestId:'explain-123'})).accepted,true);await flush();
assert.equal(started[0][3],'chatgpt');assert.equal(started[0][0],' alpha + beta ');assert.equal(started[0][4].sourceUrl,'https://example.org/download?id=1');assert.equal(started[0][4].task,'paper-explanation');assert.equal(started[0][4].surface,'pdf-panel');
service=make();await service.notify(5,{type:'EXPLANATION_PARTIAL',requestId:'explain-123',text:'Meaning'});
await service.notify(5,{type:'EXPLANATION_RESULT',requestId:'explain-123',ok:true,text:'Meaning complete',warning:'Cleanup warning'});
record=(await send({type:'PDF_PANEL_GET',tabId:5})).record;assert.equal(record.results.translate.text,'ترجمہ');assert.equal(record.results["paper-explanation"].text,'Meaning complete');assert.equal(record.results["paper-explanation"].warning,'Cleanup warning');
assert.equal(await service.notify(6,{type:'EXPLANATION_RESULT',requestId:'explain-123',text:'Wrong tab'}),false);
assert.equal((await send({type:'PDF_PANEL_GET',tabId:5},{id:'test',url:'https://untrusted.example',tab:{id:5}})).ok,false);
clicked({menuItemId:'word-pdf-selection',selectionText:'new selection',frameUrl:'https://other.example/embedded.pdf'},{id:5});await flush();
assert.equal(await service.notify(5,{type:'EXPLANATION_RESULT',requestId:'explain-123',text:'Stale answer'}),false);
assert.equal((await send({type:'PDF_PANEL_RUN',tabId:5,selectionId:record.id,action:'paper-explanation',provider:'chatgpt',language:'Urdu',requestId:'request-456'})).ok,false);
clicked({menuItemId:'word-pdf-selection',selectionText:'x'.repeat(8001)},{id:6});await flush();assert.ok(warnings.length);assert.equal(store['pdf-selection:6'],undefined);
updated(5,{url:'https://different.example'});await flush();assert.equal(store['pdf-selection:5'],undefined);
clicked({menuItemId:'word-pdf-selection',selectionText:'test'},{id:8});await flush();removed(8);await flush();assert.equal(store['pdf-selection:8'],undefined);
console.log('PASS: native PDF menu selection, synchronous side-panel opening, no automatic external request, translation and Gemini result retention, worker restart, wrong-tab and stale-answer isolation, trusted panel boundary, selection limits, navigation and tab cleanup.');

const storeCode=await fs.readFile(dir+'context-store.js','utf8');vm.runInNewContext(storeCode,ctx);assert.equal(ctx.WordContextStore.sourceUrl('file:///tmp/article.pdf'),'file:///tmp/article.pdf');assert.throws(()=>ctx.WordContextStore.sourceUrl('file:///tmp/private.txt'));assert.throws(()=>ctx.WordContextStore.sourceUrl('javascript:alert(1)'));

const exact='  \nα = '+ 'x'.repeat(1200)+'\n  ',sourceUrl='https://example.org/paper.pdf?q=a#eq2';
const prompt=ctx.WordPaperExplanation.prompt(exact,sourceUrl);
const data=JSON.parse(prompt.slice(prompt.indexOf('{')));
assert.equal(data.selectedEquationOrText,exact);assert.equal(data.sourceResearchPaperUrl,sourceUrl);
assert.match(prompt,/cannot access/);assert.match(prompt,/Cite supporting/);assert.match(prompt,/Open and research/);
for(const url of ['', 'file:///private/paper.pdf','javascript:alert(1)','https://user:secret@example.org'])assert.throws(()=>ctx.WordPaperExplanation.prompt(exact,url));
assert.throws(()=>ctx.WordPaperExplanation.prompt('x'.repeat(8001),sourceUrl));
clicked({menuItemId:'word-pdf-selection',selectionText:exact,pageUrl:sourceUrl},{id:12});await flush();
const paperRecord=(await send({type:'PDF_PANEL_GET',tabId:12})).record;
assert.equal((await send({type:'PDF_PANEL_RUN',tabId:12,selectionId:paperRecord.id,action:'paper-explanation',provider:'gemini',language:'Urdu',requestId:'paper-long-123'})).accepted,true);await flush();
assert.equal(started.at(-1)[0],exact);assert.equal(started.at(-1)[3],'chatgpt');
clicked({menuItemId:'word-pdf-selection',selectionText:'x = y',pageUrl:'file:///tmp/paper.pdf'},{id:13});await flush();
const local=(await send({type:'PDF_PANEL_GET',tabId:13})).record,count=started.length;
assert.equal((await send({type:'PDF_PANEL_RUN',tabId:13,selectionId:local.id,action:'paper-explanation',provider:'chatgpt',language:'Urdu',requestId:'paper-local-123'})).ok,false);await flush();assert.equal(started.length,count);
console.log('PASS: exact long selections and paper URLs, ChatGPT enforcement, grounded prompt, unsupported-source refusal, explicit-click and stale-selection safeguards.');

const bg=(await Promise.all(['notes-store.js','review-store.js','context-store.js','context-controller.js','paper-explanation.js','background.js'].map(name=>fs.readFile(dir+name,'utf8')))).join('\n');
async function testPaperBackground(restart=false,action="explain",translationLanguage="Urdu",provider="chatgpt"){
  let handler,alarmHandler,removedHandler;const store={},closed=[],notifications=[];let submittedPrompt="",createdUrl="";const prefix=provider.toUpperCase();
  const chrome={runtime:{id:'test',onMessage:{addListener:f=>handler=f}},commands:{onCommand:{addListener:()=>{}}},
    storage:{session:{get:async()=>structuredClone(store),set:async value=>Object.assign(store,structuredClone(value)),remove:async key=>{delete store[key]}}},
    alarms:{create:async()=>{},clear:async()=>{},onAlarm:{addListener:f=>alarmHandler=f}},
    tabs:{onRemoved:{addListener:f=>removedHandler=f},create:async options=>{createdUrl=options.url;return{id:77}},remove:async id=>closed.push(id),sendMessage:async(id,msg)=>{
      if(id===5){notifications.push(msg);return{received:true};}if(msg.type===prefix+'_START')submittedPrompt=msg.prompt;return msg.type===prefix+'_READY'?{ready:true,build:'0.4.4'}:{accepted:true};
    }}};
  const boot=()=>vm.runInNewContext(bg,{chrome,console,setTimeout,clearTimeout,Date,URL});boot();
  let ack;const returned=handler({type:'EXPLAIN_PAPER_SELECTION',text:'  α = β  ',sourceUrl:'https://example.org/paper.pdf',requestId:'r1',build:'0.4.4',action:"paper-explanation",translationLanguage,provider:"gemini"},{id:'test',tab:{id:5}},v=>ack=v);
  assert.equal(returned,undefined);assert.equal(ack.accepted,true);await flush();assert.equal(store.activeExplanationJob.tabId,77);if(action==='translate'){assert.ok(submittedPrompt.startsWith('Translate'));assert.ok(submittedPrompt.includes('into '+translationLanguage));assert.ok(submittedPrompt.includes('only the translation'));}else assert.ok(submittedPrompt.startsWith('Explain'));
  assert.equal(createdUrl,provider==="gemini"?"https://gemini.google.com/app":"https://chatgpt.com/");
  const payload=JSON.parse(submittedPrompt.slice(submittedPrompt.indexOf('{')));assert.equal(payload.selectedEquationOrText,'  α = β  ');assert.equal(payload.sourceResearchPaperUrl,'https://example.org/paper.pdf');assert.equal(store.activeExplanationJob.task,'paper-explanation');
  if(restart)boot();
  handler({type:prefix+'_PARTIAL',text:'A borrower receives a loan.'},{id:'test',tab:{id:77}},()=>{});await flush();
  assert.equal(notifications.at(-1).type,'EXPLANATION_PARTIAL');
  handler({type:prefix+'_RESULT',ok:true,text:'A borrower receives a loan and agrees to repay it.'},{id:'test',tab:{id:77}},()=>{});await flush();
  assert.equal(notifications.at(-1).type,'EXPLANATION_RESULT');assert.equal(notifications.at(-1).requestId,'r1');
  assert.deepEqual(closed,[77]);assert.equal(store.activeExplanationJob,undefined);
}

await testPaperBackground();await testPaperBackground(true);

const content=await fs.readFile(dir+'content.js','utf8');
async function testPaperPanel(action="paper-explanation",provider="chatgpt",hostname="example.com"){
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
  assert.equal(requests.length,0,'Selection alone must not call ChatGPT');if(action==='explain'){elements['llm-choices'].hidden=true;elements['ask-llm'].click();assert.equal(elements['llm-choices'].hidden,false);assert.equal(requests.length,0,'Opening provider choice must not send a request');}elements[provider==="gemini"?"gemini":action].click();await flush();assert.equal(requests[0].action,action);assert.equal(requests[0].provider,provider);assert.equal(requests[0].type,action==='paper-explanation'?'EXPLAIN_PAPER_SELECTION':action==='translate'?'TRANSLATE_SELECTION':'EXPLAIN_SELECTION');if(action==='translate')assert.equal(requests[0].translationLanguage,'Urdu');assert.equal(elements.explain.disabled,true);assert.equal(requests[0].sourceUrl,'https://example.com/');assert.equal(requests[0].text,'borrower');assert.equal(elements.result.open,true);
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
await testPaperPanel();
