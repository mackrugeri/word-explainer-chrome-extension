import fs from 'node:fs/promises';import vm from 'node:vm';import assert from 'node:assert/strict';
const dir=new URL('../extension/',import.meta.url);
class Element{
 constructor(){this.children=[];this.value='';this.hidden=false;this.attrs={}}
 appendChild(node){this.children.push(node)}replaceChildren(){this.children=[]}setAttribute(k,v){this.attrs[k]=v}addEventListener(type,fn){this[type]=fn}focus(){}showModal(){}close(){}
}
const html=await fs.readFile(new URL('contexts.html',dir),'utf8');const elements={};for(const [,id]of html.matchAll(/id="([^"]+)"/g))elements[id]=new Element();
elements.provider.value='chatgpt';let listener,storageListener;
let context={id:'c1',name:'Research',revision:2,quotes:[{id:'q1',title:'One',url:'https://example.com/1',text:'One'},{id:'q2',title:'Two',url:'https://example.com/2',text:'Two'}],links:[],summary:null};
const chrome={runtime:{id:'test',onMessage:{addListener:fn=>listener=fn},sendMessage:async msg=>msg.type==='CONTEXT_LIST'?{ok:true,contexts:[structuredClone(context)],activeJob:null}:{accepted:true}},storage:{onChanged:{addListener:fn=>storageListener=fn}}};
const flush=async()=>{for(let i=0;i<20;i++)await new Promise(setImmediate)};
vm.runInNewContext(await fs.readFile(new URL('contexts.js',dir),'utf8'),{chrome,document:{getElementById:id=>elements[id],createElement:()=>new Element(),createTextNode:text=>({textContent:text})},WordContextGraph:{create:()=>({render(){}})},URL,location:{href:'chrome-extension://test/contexts.html'},crypto:{randomUUID:()=> 'request-1'},Date,history:{replaceState(){}}});
await flush();await elements.summarize.click();await flush();
context.summary={revision:2,provider:'chatgpt',text:'Saved summary',sources:[]};storageListener({wordContextsV1:{}},'local');await flush();
listener({type:'CONTEXT_SUMMARY_RESULT',contextId:'c1',requestId:'request-1',ok:true,warning:'Chat cleanup: failed at menu.'},{id:'test'});await flush();
assert.equal(elements.status.textContent,'Chat cleanup: failed at menu.','Saving summary must not discard the pending request before the cleanup warning arrives');
console.log('PASS: summary save/storage refresh does not discard the final cleanup result or warning.');
