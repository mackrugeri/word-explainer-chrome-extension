import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright'),dir=new URL('../extension/',import.meta.url),files={};
for(const name of await fs.readdir(dir))if(/\.(js|css|html)$/.test(name))files[name]=await fs.readFile(new URL(name,dir),'utf8');
const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',dir),'utf8')),script=manifest.content_scripts.find(s=>s.matches.includes('https://storage.googleapis.com/cloud-training/*'));
assert.ok(script.all_frames&&script.js.includes('notes-panel.js')&&script.js.includes('highlighter.js')&&script.js.includes('content.js'));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1100,height:850}}),data={},requests=[];
 await context.exposeFunction('storageRead',keys=>{if(typeof keys==='string')return{[keys]:data[keys]};return{...keys,...data};});
 await context.exposeFunction('storageWrite',value=>Object.assign(data,value));
 await context.exposeFunction('localRequest',m=>{requests.push(m);if(m.type==='NOTES_LIST')return{ok:true,notes:data.notes||[]};if(m.type==='NOTES_SAVE'){data.notes=[{...m.record,id:'note',url:m.pageUrl}];return{ok:true};}return{ok:true,accepted:true,items:[]};});
 await context.addInitScript(()=>{
  window.listeners=[];window.roots=[];const attach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(o){const root=attach.call(this,o);roots.push(root);return root;};
  window.chrome={runtime:{id:'test',onMessage:{addListener:f=>listeners.push(f)},sendMessage:m=>localRequest(m)},storage:{local:{get:keys=>storageRead(keys),set:v=>storageWrite(v)},onChanged:{addListener(){},removeListener(){}}}};
 });
 await context.route('https://www.skills.google/**',r=>r.fulfill({contentType:'text/html',body:'<h1>Course fixture</h1><p id="stale">Old parent selection</p><iframe src="https://storage.googleapis.com/cloud-training/course/index.html" style="width:900px;height:700px;border:0"></iframe>'}));
 await context.route('https://storage.googleapis.com/cloud-training/**',r=>r.fulfill({contentType:'text/html',body:'<h1>Lesson</h1><p id="passage">This selected lesson passage discusses how models learn from research data.</p>'}));
 const page=await context.newPage();await page.goto('https://www.skills.google/paths/1281/course_templates/1060/documents/527181');
 const frame=page.frames().find(f=>f.url().startsWith('https://storage.googleapis.com/'));for(const name of script.js)await frame.addScriptTag({content:files[name]});
 await frame.locator('#passage').click();
 await frame.evaluate(()=>{const range=document.createRange();range.selectNodeContents(document.getElementById('passage'));getSelection().removeAllRanges();getSelection().addRange(range);for(const fn of listeners)fn({type:'COLLECT_COURSE_SELECTION'},{id:'test'},value=>window.collected=value);window.panel=roots.find(r=>r.getElementById('ask-llm'));});
 assert.equal(await frame.evaluate(()=>collected.shown),true);assert.equal(await frame.evaluate(()=>panel.host.style.display),'block');assert.ok(await frame.evaluate(()=>panel.getElementById('word').textContent.includes('selected lesson')));
 assert.equal(requests.some(m=>/EXPLAIN|SUMMARIZE|FIND_SELECTION/.test(m.type)),false);
 await frame.evaluate(()=>panel.getElementById('highlight-colors').querySelector('button').click());
 await frame.waitForFunction(()=>Object.keys(CSS.highlights).length||CSS.highlights.size>0);assert.ok(Object.keys(data).some(k=>/highlight/i.test(k)),'Real frame range is persistently highlighted');
 await frame.evaluate(()=>panel.getElementById('notes-taken').click());
 const note=await frame.evaluate(()=>{const editor=roots.find(r=>r.getElementById('editor'));window.noteRoot=editor;return{open:!editor.getElementById('editor').hidden,quote:editor.getElementById('quote').textContent};});assert.equal(note.open,true);assert.ok(note.quote.includes('selected lesson'));
 await frame.evaluate(()=>{noteRoot.getElementById('body').value='A note on this lesson.';noteRoot.getElementById('body').dispatchEvent(new Event('input'));noteRoot.getElementById('save').click();});
 await frame.waitForFunction(()=>noteRoot.getElementById('editor').hidden);assert.equal(data.notes[0].url,frame.url());
 await page.screenshot({path:'/tmp/word-explainer-course-frame.png'});
 await frame.evaluate(()=>{for(const fn of listeners)fn({type:'COLLECT_COURSE_SELECTION'},{id:'test'},()=>{});panel.getElementById('selection-references').click();});
 await page.waitForFunction(()=>true);assert.equal(requests.at(-1).type,'FIND_SELECTION_REFERENCES');
 console.log('PASS: real cross-origin lesson-frame popup, exact selection, saved highlight, attached note, no implicit model requests and reference action.');
}finally{await browser.close();}
