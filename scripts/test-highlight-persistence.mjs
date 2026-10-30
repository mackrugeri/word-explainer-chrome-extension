import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const scripts=await Promise.all(['notes-anchor.js','highlighter.js'].map(name=>fs.readFile(new URL('../extension/'+name,import.meta.url),'utf8')));
const data={};
const fixture=`<main><article id="first">${'first context '.repeat(9)}<span id="first-word">repeat</span>${' first ending'.repeat(9)}</article><article id="second">${'second context '.repeat(9)}<span id="second-word">repeat</span>${' second ending'.repeat(9)}</article><p id="mixed">Alpha <em>beta</em> gamma</p></main>`;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext();
 await context.route('https://example.test/**',route=>route.fulfill({contentType:'text/html',body:fixture}));
 await context.exposeBinding('highlightStorage',async(_,op,value)=>{
  if(op==='get')return value===null?structuredClone(data):{[value]:structuredClone(data[value])};
  if(op==='set'){Object.assign(data,structuredClone(value));return;}
  if(op==='remove'){delete data[value];return;}
  if(op==='keys')return Object.keys(data);
 });
 async function boot(page){
  for(const content of scripts)await page.addScriptTag({content});
  await page.evaluate(async()=>{
   window.store={get:k=>highlightStorage('get',k),set:v=>highlightStorage('set',v),remove:k=>highlightStorage('remove',k),getKeys:()=>highlightStorage('keys')};
   window.api=WordHighlighter.createPersistent({storage:store});await api.ready;
   window.passage=id=>{const r=document.createRange();r.selectNodeContents(document.getElementById(id));return r;};
   window.painted=color=>Array.from(CSS.highlights.get('word-explainer-'+color)||[]).map(r=>r.startContainer.parentElement.id);
  });
 }
 const page=await context.newPage();await page.goto('https://example.test/chapter?view=1#part');await boot(page);
 assert.equal(await page.evaluate(()=>api.apply(passage('second-word'),'purple')),true);
 const savedKey=Object.keys(data)[0];assert.equal(savedKey,'wordHighlightsV1:https://example.test/chapter?view=1');
 assert.equal(data[savedKey].items[0].color,'purple');
 await page.reload();await boot(page);
 assert.deepEqual(await page.evaluate(()=>painted('purple')),['second-word'],'Reload restores correct repeated occurrence');
 const reopened=await context.newPage();await reopened.goto('https://example.test/chapter?view=1');await boot(reopened);
 assert.deepEqual(await reopened.evaluate(()=>painted('purple')),['second-word'],'Reopening restores saved color');
 await reopened.evaluate(()=>api.apply(passage('second-word'),'orange'));
 await reopened.reload();await boot(reopened);
 assert.deepEqual(await reopened.evaluate(()=>painted('purple')),[]);assert.deepEqual(await reopened.evaluate(()=>painted('orange')),['second-word']);
 await reopened.evaluate(()=>api.remove(passage('second-word')));
 await reopened.reload();await boot(reopened);assert.deepEqual(await reopened.evaluate(()=>painted('orange')),[],'Removal survives reload');
 await reopened.evaluate(()=>api.apply(passage('second-word'),'blue'));
 await reopened.evaluate(()=>{const p=document.createElement('p');p.textContent='New content inserted before the article.';document.body.prepend(p);});
 await reopened.waitForFunction(()=>painted('blue')[0]==='second-word');
 await reopened.evaluate(()=>document.getElementById('second-word').textContent='changed');
 await reopened.waitForFunction(()=>painted('blue').length===0);
 assert.match(await reopened.evaluate(()=>api.status()),/1 saved highlight.*awaiting/);
 await reopened.evaluate(()=>document.getElementById('second-word').textContent='repeat');
 await reopened.waitForFunction(()=>painted('blue')[0]==='second-word');
 await reopened.evaluate(()=>document.querySelector('main').append(document.getElementById('second').cloneNode(true)));
 await reopened.waitForFunction(()=>painted('blue').length===0,'Ambiguous repeated context is never guessed');
 await reopened.reload();await boot(reopened);
 await reopened.evaluate(()=>{history.pushState({},'', '/other');});
 await reopened.waitForFunction(()=>painted('blue').length===0);
 await reopened.evaluate(()=>{history.pushState({},'', '/chapter?view=1');});
 await reopened.waitForFunction(()=>painted('blue')[0]==='second-word');
 // Two independently created controllers merge against latest storage under Web Locks.
 await reopened.evaluate(async()=>{
  const other=WordHighlighter.createPersistent({storage:store});await other.ready;
  await Promise.all([api.apply(passage('first-word'),'green'),other.apply(passage('mixed'),'pink')]);other.dispose();
 });
 assert.equal(data[savedKey].items.length,3,'Concurrent controllers preserve disjoint saves');
 await reopened.reload();await boot(reopened);
 assert.deepEqual(await reopened.evaluate(()=>painted('pink')),['mixed'],'Cross-element selection restores');
 // Exercise the actual popup with asynchronous durable writes and restored active color.
 await reopened.evaluate(()=>{
  api.dispose();
  const attach=Element.prototype.attachShadow;
  Element.prototype.attachShadow=function(options){const result=attach.call(this,options);window.popupRoot=result;return result;};
  window.chrome={runtime:{id:'test',onMessage:{addListener(fn){window.popupMessage=fn;}},sendMessage:async()=>({})},storage:{local:{...store,get:async key=>typeof key==='object'?key:store.get(key)},onChanged:{addListener(){},removeListener(){}}}};
  const create=WordHighlighter.createPersistent;WordHighlighter.createPersistent=(...args)=>window.popupHighlighter=create(...args);
 });
 await reopened.addScriptTag({content:await fs.readFile(new URL('../extension/content.js',import.meta.url),'utf8')});
 await reopened.evaluate(async()=>{
  await popupHighlighter.ready;
  getSelection().removeAllRanges();getSelection().addRange(passage('second-word'));
  popupMessage({type:'SHOW_SELECTION_MENU'},{id:'test'},()=>{});
  const colors=popupRoot.getElementById('highlight-colors').children;
  if(colors[5].getAttribute('aria-pressed')!=='true')throw Error('Restored blue active state missing');
  getSelection().removeAllRanges();colors[4].click();
 });
 await reopened.waitForFunction(()=>popupRoot.getElementById('highlight-colors').children[4].getAttribute('aria-pressed')==='true');
 assert.equal(data[savedKey].items.find(item=>item.anchor.exact==='repeat'&&item.anchor.prefix.includes('second')).color,'purple');
 await reopened.evaluate(()=>popupRoot.getElementById('remove-highlight').click());
 await reopened.waitForFunction(()=>!CSS.highlights.has('word-explainer-purple'));
 assert.equal(data[savedKey].items.length,2,'Popup removal updates durable storage');
 const separate=await context.newPage();await separate.goto('https://example.test/chapter?view=2');await boot(separate);
 assert.equal(await separate.evaluate(()=>CSS.highlights.size),0,'Query URLs stay isolated');
 await separate.evaluate(async()=>{
  api.dispose();CSS.highlights.clear();
  const broken=WordHighlighter.createPersistent({storage:{...store,set:async()=>{throw Error('Storage quota exceeded');}}});await broken.ready;
  let failed=false;try{await broken.apply(passage('first-word'),'red');}catch(e){failed=/quota/.test(e.message);}
  if(!failed||CSS.highlights.size)throw Error('Failed save must not pretend it persisted');broken.dispose();
 });
 // Storage bounds reject a new highlight without silently evicting existing saved data.
 await separate.evaluate(async()=>{
  const anchor=WordNotesAnchor.capture(document,passage('first-word'));
  const items=Array.from({length:80},(_,i)=>({id:String(i),color:'green',anchor:{...anchor,exact:'missing '+i}}));
  const key='wordHighlightsV1:'+location.href;
  await store.set({[key]:{version:1,items}});
  const bounded=WordHighlighter.createPersistent({storage:store});await bounded.ready;
  let failed=false;try{await bounded.apply(passage('mixed'),'red');}catch(e){failed=/full/.test(e.message);}
  if(!failed||(await store.get(key))[key].items.length!==80)throw Error('Storage bounds lost saved highlights');bounded.dispose();
 });
 console.log('PASS: persistent popup/active states, colors after reload/reopen, repeated quote/context anchors, cross-element ranges, durable recolor/removal, changed/missing/ambiguous text, late text restoration, SPA/query isolation, concurrent controller merges, storage failure and bounded-data preservation.');
}finally{await browser.close();}
