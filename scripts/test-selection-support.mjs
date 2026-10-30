import fs from 'node:fs/promises';import vm from 'node:vm';import assert from 'node:assert/strict';
const dir=new URL('../extension/',import.meta.url);
const equation={};vm.runInNewContext(await fs.readFile(new URL('equation-speech.js',dir),'utf8'),equation);
const read=input=>equation.WordEquationSpeech.toSpeech(input);
assert.equal(read('α + β = γ').text,'alpha plus beta equals gamma');assert.equal(read('Ω').text,'capital omega');
assert.equal(read(String.raw`\frac{\alpha+\beta}{\gamma}`).text,'fraction alpha plus beta over gamma end fraction');
assert.ok(read(String.raw`x_i^2`).text.includes('end subscript squared'));assert.ok(read(String.raw`\sqrt{x^2+y^2}`).text.includes('square root of'));
assert.ok(read(String.raw`\sum_{i=1}^{n} x_i`).text.startsWith('sum from i equals 1 to n of'));assert.ok(read('x² + y₁ <= 3').ok);
for(const value of ['',String.raw`\begin{matrix}x\end{matrix}`,String.raw`\frac{x}{}`,String.raw`x^{2`,'x'.repeat(4001),'ordinary prose'])assert.equal(read(value).ok,false,value);

const frameSource=await fs.readFile(new URL('course-selection.js',dir),'utf8');
function collect(referrer='https://www.skills.google/paths/1',editable=false){
 let handler;const win={top:{},getSelection:()=>({toString:()=> 'Identify uses and advantages of BigQuery ML for inference.',rangeCount:1,getRangeAt:()=>({commonAncestorContainer:{nodeType:1,isContentEditable:editable},getBoundingClientRect:()=>({left:20,top:50,bottom:70})})})};
 vm.runInNewContext(frameSource,{window:win,URL,document:{referrer},location:{href:'https://storage.googleapis.com/cloud-training/course/index.html'},chrome:{runtime:{id:'test',onMessage:{addListener:f=>handler=f}}}});
 let result;handler?.({type:'COLLECT_COURSE_SELECTION'},{id:'test'},value=>result=value);return result;
}
assert.ok(collect().text.includes('BigQuery'));assert.equal(collect('https://unrelated.example'),undefined);assert.equal(collect(undefined,true),undefined);

const bg=(await Promise.all(['notes-store.js','review-store.js','context-store.js','context-controller.js','background.js'].map(name=>fs.readFile(new URL(name,dir),'utf8')))).join('\n');
let command;const sent=[];let badge='';
const chrome={runtime:{id:'test',getURL:name=>'chrome-extension://test/'+name,onMessage:{addListener(){}},sendMessage:async msg=>{sent.push(msg);return{ok:true,shown:true,build:'0.4.4'}}},storage:{local:{},session:{}},commands:{onCommand:{addListener:f=>command=f}},alarms:{onAlarm:{addListener(){}}},action:{setBadgeText:async value=>badge=value.text,setTitle:async()=>{}},tabs:{onRemoved:{addListener(){}},sendMessage:async(id,msg,options)=>{sent.push({...msg,options});if(msg.type==='SHOW_SELECTION_MENU')return{ok:true,shown:false,build:'0.4.4',courseFramesAllowed:true};if(msg.type==='COLLECT_COURSE_SELECTION')return{ok:true,text:'BigQuery ML',sourceUrl:'https://storage.googleapis.com/cloud-training/course/index.html',rect:{left:20,top:50,bottom:70}};return{shown:true};}}};
vm.runInNewContext(bg,{chrome,URL,Date,setTimeout,clearTimeout});await command('show-selection-menu',{id:5,url:'https://www.skills.google/paths/1'});
assert.equal(sent[1].type,'COLLECT_COURSE_SELECTION');assert.equal(sent[2].type,'SHOW_COURSE_SELECTION_MENU');assert.equal(sent[2].options.frameId,0);assert.equal(badge,'');

const content=await fs.readFile(new URL('content.js',dir),'utf8');let handler;const elements={},utterances=[];const root={getElementById:id=>elements[id],addEventListener(){}};
Object.defineProperty(root,'innerHTML',{set:html=>{for(const [,id]of html.matchAll(/id="([^"]+)"/g))elements[id]={style:{},textContent:'',setAttribute(k,v){this[k]=v},addEventListener(type,fn){this[type]=fn}}}});
const host={style:{},attachShadow:()=>root,getBoundingClientRect:()=>({left:50,top:50,width:392,height:300})};
const doc={title:'Lesson',createElement:()=>host,documentElement:{appendChild(){}},addEventListener(){},querySelectorAll:()=>[{src:'https://storage.googleapis.com/cloud-training/course/index.html',getBoundingClientRect:()=>({left:100,top:100})}]};
const ctx={WordEquationSpeech:equation.WordEquationSpeech,URL,location:{hostname:'www.skills.google',href:'https://www.skills.google/paths/1'},chrome:{runtime:{id:'test',onMessage:{addListener:f=>handler=f},sendMessage:async()=>({accepted:true})},storage:{local:{get:async settings=>({...settings,language:'ur-PK'})},onChanged:{addListener(){}}}},document:doc,window:{getSelection:()=>({toString:()=> 'α + β = γ',rangeCount:1,getRangeAt:()=>({getBoundingClientRect:()=>({left:20,top:50,bottom:70})})}),addEventListener(){}},innerWidth:1200,innerHeight:800,setTimeout:()=>1,clearTimeout(){},speechSynthesis:{cancel(){},getVoices:()=>[{lang:'en-GB'}],speak:utterance=>utterances.push(utterance)},SpeechSynthesisUtterance:class{constructor(text){this.text=text}}};
vm.runInNewContext(content,ctx);await new Promise(setImmediate);
handler({type:'SHOW_SELECTION_MENU'},{id:'test'},()=>{});elements['equation-speak'].click();assert.equal(utterances.at(-1).text,'alpha plus beta equals gamma');assert.equal(utterances.at(-1).lang,'en-US');
elements.speak.click();assert.equal(utterances.at(-1).text,'α + β = γ');assert.equal(utterances.at(-1).lang,'ur-PK','Ordinary pronunciation keeps its configured language');
let reply;handler({type:'SHOW_COURSE_SELECTION_MENU',build:'0.4.4',selection:{text:'BigQuery ML',sourceUrl:'https://storage.googleapis.com/cloud-training/course/index.html',rect:{left:20,top:50,bottom:70}}},{id:'test'},value=>reply=value);assert.equal(reply.shown,true);assert.equal(elements.word.textContent,'BigQuery ML');
handler({type:'SHOW_COURSE_SELECTION_MENU',build:'0.4.4',selection:{text:'bad',sourceUrl:'https://unrelated.example',rect:{left:0,top:0,bottom:0}}},{id:'test'},value=>reply=value);assert.equal(reply.ok,false);
console.log('PASS: Greek/LaTeX conversion and English speech, preserved ordinary pronunciation, invalid math feedback, Google Skills frame selection, unrelated-origin refusal, top-frame display.');
