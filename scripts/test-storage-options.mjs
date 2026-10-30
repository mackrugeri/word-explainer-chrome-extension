import fs from 'node:fs/promises';import vm from 'node:vm';import assert from 'node:assert/strict';import {createRequire}from'node:module';import{randomUUID}from'node:crypto';
const{chromium}=createRequire(import.meta.url)('playwright');const dir=new URL('../extension/',import.meta.url);
const files=Object.fromEntries(await Promise.all(['options.html','options.css','options.js','storage-options.js','storage-manager.js','notes-store.js','review-store.js'].map(async name=>[name,await fs.readFile(new URL(name,dir),'utf8')])));
const dangerous='<img src=x onerror="window.injected=true">';
const data={language:'ur-PK',rate:1.1,wordPersonalNotesV1:[{id:'n',url:'https://docs.test/chapter',body:'میرا نوٹ',anchor:{exact:dangerous}}],wordReviewPagesV1:[{url:'https://docs.test',items:[{text:'Saved review',notes:[{action:'explain',summary:'Answer'}]}]}],wordContextsV1:[{id:'ctx',name:'Shared study',quotes:[{url:'https://docs.test/chapter',text:'quote'}]}],['wordHighlightsV1:https://docs.test/chapter']:{items:[{id:'h',color:'blue',anchor:{exact:'Saved highlight'}}]},['wordHighlightsV1:https://other.test/chapter']:{items:[{id:'h2',color:'blue',anchor:{exact:'Other highlight'}}]}};
const storage={get:async key=>key===null?structuredClone(data):typeof key==='object'?{...key,...structuredClone(data)}:{[key]:structuredClone(data[key])},set:async value=>Object.assign(data,structuredClone(value)),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete data[key]},getKeys:async()=>Object.keys(data)};
const ctx={URL,TextEncoder,crypto:{randomUUID}};for(const name of ['notes-store.js','review-store.js','storage-manager.js'])vm.runInNewContext(files[name],ctx);const manager=ctx.WordStorageManager.create({storage,reviewStore:ctx.WordReviewStore.create(storage),notesStore:ctx.WordNotesStore.create(storage)});
let fail=false;const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1000,height:900}});
 await page.exposeFunction('storageBridge',async(op,value)=>{if(op==='get')return storage.get(value);if(op==='set')return storage.set(value);if(fail)throw Error('Storage unavailable');if(value.type==='STORAGE_CLEAR_SITE')await manager.clear(value.site,value.category);return{ok:true,report:await manager.inspect()};});
 await page.addInitScript(()=>{window.chrome={storage:{local:{get:key=>storageBridge('get',key),set:value=>storageBridge('set',value)}},runtime:{sendMessage:message=>storageBridge('message',message)}};});
 await page.route('https://settings.test/**',route=>{const file=new URL(route.request().url()).pathname.slice(1)||'options.html';return route.fulfill({body:files[file]||'',contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html'});});
 await page.goto('https://settings.test/options.html');await page.getByText('Storage list is up to date.',{exact:true}).waitFor();
 assert.equal(await page.locator('#language').inputValue(),'ur-PK');assert.equal(await page.locator('.storage-site').count(),2);
 const site=page.locator('.storage-site').filter({has:page.getByRole('heading',{name:'https://docs.test',exact:true})});
 await site.locator('.storage-preview summary').first().click();await site.locator('.storage-preview summary').nth(1).click();
 assert.ok((await site.textContent()).includes(dangerous));assert.equal(await page.locator('#storage-sites img').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);
 // Canceled deletion is inert.
 page.once('dialog',dialog=>dialog.dismiss());await site.getByRole('button',{name:'Remove personal notes for https://docs.test',exact:true}).click();assert.equal(data.wordPersonalNotesV1.length,1);
 page.once('dialog',dialog=>dialog.accept());await site.getByRole('button',{name:'Remove personal notes for https://docs.test',exact:true}).click();await page.waitForFunction(()=>document.getElementById('storage-status').textContent.startsWith('Removed personal notes'));
 assert.equal(data.wordPersonalNotesV1.length,0);assert.ok(data['wordHighlightsV1:https://docs.test/chapter']);
 page.once('dialog',dialog=>dialog.accept());await site.getByRole('button',{name:'Remove site data',exact:true}).click();await page.waitForFunction(()=>document.getElementById('storage-status').textContent.startsWith('Removed all highlights'));
 assert.ok(!data['wordHighlightsV1:https://docs.test/chapter']);assert.ok(data['wordHighlightsV1:https://other.test/chapter']);assert.equal(data.wordContextsV1.length,1);assert.equal(data.language,'ur-PK');
 await page.locator('#language').selectOption('en-GB');await page.getByRole('button',{name:'Save settings',exact:true}).click();await page.getByText('Settings saved.',{exact:true}).waitFor();assert.equal(data.language,'en-GB');
 await page.setViewportSize({width:360,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile screen has no horizontal overflow');
 fail=true;await page.getByRole('button',{name:'Refresh list',exact:true}).click();await page.waitForFunction(()=>document.getElementById('storage-status').textContent.includes('Storage unavailable'));assert.equal(await page.getByRole('button',{name:'Refresh list',exact:true}).isEnabled(),true);
 console.log('PASS: real Chrome Settings inventory, site counts/previews, inert saved text, cancel/confirm category and site removal, protected contexts/settings, preserved Save settings, mobile layout and error recovery.');
}finally{await browser.close();}
