import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright'),dir=new URL('../extension/',import.meta.url),files={};for(const name of await fs.readdir(dir))if(/\.(js|css|html)$/.test(name))files[name]=await fs.readFile(new URL(name,dir),'utf8');
const preference={},browser=await chromium.launch({channel:'chrome',headless:true});try{
 const context=await browser.newContext({viewport:{width:1100,height:850}});await context.exposeFunction('prefs',(op,value)=>{if(op==='set'){Object.assign(preference,value);return;}return{...value,...preference};});
 await context.addInitScript(()=>{
  window.changes=[];window.sent=[];window.roots=[];const attach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(o){const r=attach.call(this,o);roots.push(r);return r;};
  window.chrome={runtime:{id:'test',onMessage:{addListener:f=>window.handler=f},sendMessage:async m=>{sent.push(m);if(m.type==='PDF_PANEL_GET')return{ok:true,record:{id:'pdf',text:'Selected PDF concept.',url:'https://paper.test/paper.pdf',results:{}}};if(m.type==='STORAGE_INSPECT')return{ok:true,report:{sites:[],contexts:[],preferences:{count:1,bytes:20},others:[],totalBytes:20,quotaBytes:10485760}};return{ok:true,accepted:true};}},storage:{local:{get:d=>prefs('get',d),set:async value=>{await prefs('set',value);changes.forEach(fn=>fn(Object.fromEntries(Object.entries(value).map(([key,newValue])=>[key,{newValue}])),'local'));}},onChanged:{addListener:f=>changes.push(f)}},tabs:{query:async()=>[{id:5}],onActivated:{addListener(){}}}};
 });
 await context.route('https://prefs.test/**',r=>{const name=new URL(r.request().url()).pathname.slice(1);return r.fulfill({body:files[name]||'<p id="selected">A useful selected concept.</p>',contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});});
 const settings=await context.newPage();await settings.goto('https://prefs.test/options.html');await settings.waitForFunction(()=>document.getElementById('askProvider').value==='ask');assert.deepEqual(await settings.locator('#askProvider option').allTextContents(),['Ask with ChatGPT','Ask with Gemini','Ask me first']);
 async function save(value){await settings.locator('#askProvider').selectOption(value);await settings.getByRole('button',{name:'Save settings',exact:true}).click();await settings.waitForFunction(()=>document.getElementById('status').textContent==='Settings saved.');assert.equal(preference.askProvider,value);await settings.reload();await settings.waitForFunction(value=>document.getElementById('askProvider').value===value,value);}
 await save('chatgpt');
 const page=await context.newPage();await page.goto('https://prefs.test/fixture');await page.addScriptTag({content:files['content.js']});await page.evaluate(()=>{const r=document.createRange();r.selectNodeContents(document.getElementById('selected'));getSelection().removeAllRanges();getSelection().addRange(r);handler({type:'SHOW_SELECTION_MENU'},{id:'test'},()=>{});window.root=roots.at(-1);});
 async function sync(page,value){await page.evaluate(value=>changes.forEach(fn=>fn({askProvider:{newValue:value}},'local')),value);}
 for(const provider of ['chatgpt','gemini','ask']){
  await save(provider);await sync(page,provider);const before=await page.evaluate(()=>sent.length);await page.evaluate(()=>root.getElementById('ask-llm').click());
  if(provider==='ask'){assert.equal(await page.evaluate(()=>sent.length),before);assert.equal(await page.evaluate(()=>root.getElementById('llm-choices').hidden),false);await page.evaluate(()=>root.getElementById('gemini').click());}
  await page.waitForFunction(before=>sent.length>before,before);const request=await page.evaluate(()=>sent.at(-1));assert.equal(request.type,'EXPLAIN_SELECTION');assert.equal(request.provider,provider==='ask'?'gemini':provider);assert.equal(await page.evaluate(()=>root.getElementById('llm-choices').hidden),true);
  await page.evaluate(request=>handler({type:'EXPLANATION_RESULT',requestId:request.requestId,ok:true,text:'Local fixture answer.'},{id:'test'},()=>{}),request);
 }
 const pdf=await context.newPage();await pdf.goto('https://prefs.test/pdf-panel.html');await pdf.locator('#workspace').waitFor({state:'visible'});
 for(const provider of ['chatgpt','gemini','ask']){
  await save(provider);await sync(pdf,provider);await pdf.waitForFunction(()=>true);const before=await pdf.evaluate(()=>sent.filter(m=>m.type==='PDF_PANEL_RUN').length);await pdf.locator('#ask').click();
  if(provider==='ask'){assert.equal(await pdf.evaluate(()=>sent.filter(m=>m.type==='PDF_PANEL_RUN').length),before);assert.equal(await pdf.locator('#providers').isVisible(),true);await pdf.locator('#chatgpt').click();}
  await pdf.waitForFunction(before=>sent.filter(m=>m.type==='PDF_PANEL_RUN').length>before,before);const request=await pdf.evaluate(()=>sent.filter(m=>m.type==='PDF_PANEL_RUN').at(-1));assert.equal(request.action,'explain');assert.equal(request.provider,provider==='ask'?'chatgpt':provider);
 }
 await settings.screenshot({path:'/tmp/word-explainer-default-provider-settings.png',fullPage:true});
 console.log('PASS: three Settings choices, safe initial default, save/reload persistence, live preference changes, direct ChatGPT/Gemini and Ask me first on webpage and PDF, no request before explicit action.');
}finally{await browser.close();}
