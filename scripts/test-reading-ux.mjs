import fs from'node:fs/promises';import vm from'node:vm';import assert from'node:assert/strict';import{createRequire}from'node:module';
const dir=new URL('../extension/',import.meta.url),source=await fs.readFile(new URL('reading-progress.js',dir),'utf8'),api={URL};vm.runInNewContext(source,api);const data={},storage={get:async key=>({[key]:structuredClone(data[key])}),set:async value=>Object.assign(data,structuredClone(value))},store=api.WordReadingProgress.createStore(storage),service=api.WordReadingProgress.createService({runtime:{id:'test'}},store);const url='https://ux.test/article',sender={id:'test',frameId:0,tab:{id:1},url};const send=(message,s=sender)=>new Promise(resolve=>service.handle(message,s,resolve));
await store.update(url,{position:{y:800,ratio:.8}});await send({type:'READING_SAVE',url,position:{y:0,ratio:0},furthestRatio:.8,timer:{id:'session-111',total:1000}});await send({type:'READING_SAVE',url,timer:{id:'session-111',total:1000}});assert.equal((await store.get(url)).activeMs,1000,'Timer retry is idempotent');await send({type:'READING_SAVE',url,timer:{id:'session-222',total:500}});await send({type:'READING_SAVE',url,timer:{id:'session-111',total:1500}});assert.equal((await store.get(url)).activeMs,2000);assert.equal((await store.get(url)).furthestRatio,.8);assert.equal((await store.get(url)).position.y,0);assert.equal((await send({type:'READING_SAVE',url,timer:{id:'bad',total:-1}})).ok,false);await store.clearPage(url);
const{chromium}=createRequire(import.meta.url)('playwright'),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:900,height:600}});const html='<!doctype html><style>html,body{margin:0;height:100%;overflow:hidden}main{position:fixed;inset:50px 100px;overflow-y:auto;font:18px/2 Georgia}p{height:140px;margin:0}</style><main>'+Array.from({length:35},(_,i)=>`<p>Reading paragraph ${i}.</p>`).join('')+'</main>';
 await page.route('https://ux.test/**',r=>r.fulfill({contentType:'text/html',body:html}));await page.exposeFunction('sendReading',m=>send(m,{...sender,url:m.url}));
 await page.addInitScript(()=>{window.changes=[];window.visibility='visible';Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>visibility});window.chrome={runtime:{id:'test',sendMessage:m=>sendReading(m)},storage:{onChanged:{addListener:f=>changes.push(f)}}};});
 async function inject(timing={}){await page.addScriptTag({content:source});await page.evaluate(timing=>{window.state=null;window.snapshots=[];window.tracker=WordReadingProgress.createTracker({...timing,onChange:s=>{state=s;snapshots.push(s);}});},timing);await page.waitForFunction(()=>state.ready);}
 await page.goto(url);await inject({idleMs:10000,tickMs:50,flushMs:200});
 await page.evaluate(()=>{document.querySelector('main').scrollTop=2200;});
 await page.evaluate(()=>changes.forEach(f=>f({wordReadingProgressV1:{oldValue:[],newValue:[{url:'https://ux.test/other'}]}},'local')));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.evaluate(()=>tracker.save());
 assert.equal(await page.evaluate(()=>state.activeMs),0);
 assert.equal(await page.evaluate(()=>state.furthestRatio),0);
 assert.equal(await store.get(url),null,'Visit-only activity is no longer saved');
 await page.evaluate(()=>{document.querySelector('main').scrollTop=0;return tracker.toggleReading();});
 // Visit a deep point and go back before the throttled save; the peak must still be retained.
 await page.evaluate(()=>{document.querySelector('main').scrollTop=2200;});await page.waitForFunction(()=>state.furthestRatio>.45);const peak=await page.evaluate(()=>state.furthestRatio);await page.evaluate(()=>{document.querySelector('main').scrollTop=100;});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.evaluate(()=>tracker.save());let saved=await store.get(url);assert.ok(saved.furthestRatio>=peak);assert.equal(saved.position.y,100);assert.equal(saved.position.scope,'panel');assert.equal(await page.evaluate(()=>scrollY),0);
 await page.reload();await inject({idleMs:10000,tickMs:50,flushMs:200});assert.ok(await page.evaluate(()=>state.furthestRatio)>=peak);assert.equal(await page.evaluate(()=>state.reading),true,'Reading stays started after refresh');assert.equal(await page.evaluate(()=>document.querySelector('main').scrollTop),0,'No automatic reading jump');
 await page.evaluate(()=>dispatchEvent(new Event('pagehide')));await page.evaluate(()=>tracker.save());assert.equal((await store.get(url)).position.y,100,'Opening and leaving without scrolling preserves the resume point');
 await page.reload();await inject({idleMs:160,tickMs:20,flushMs:60});await page.mouse.move(300,180);await page.waitForFunction(()=>state.activeMs>0);
 for(let i=0;i<6;i++){await page.mouse.move(300+i*4,180);await new Promise(r=>setTimeout(r,35));}assert.equal(await page.evaluate(()=>state.timerActive),true,'Continuous user activity keeps time running');
 await page.evaluate(()=>dispatchEvent(new FocusEvent('blur')));await page.evaluate(()=>tracker.save());const blurred=await page.evaluate(()=>state.activeMs);await new Promise(r=>setTimeout(r,120));assert.ok(Math.abs(await page.evaluate(()=>state.activeMs)-blurred)<2,'Blur time is paused');
 await page.evaluate(()=>dispatchEvent(new FocusEvent('focus')));await page.waitForFunction(before=>state.activeMs>before+20,blurred);await page.evaluate(()=>{visibility='hidden';document.dispatchEvent(new Event('visibilitychange'));});await page.evaluate(()=>tracker.save());const hidden=await page.evaluate(()=>state.activeMs);await new Promise(r=>setTimeout(r,120));assert.ok(Math.abs(await page.evaluate(()=>state.activeMs)-hidden)<2,'Hidden tab time is paused');
 await page.evaluate(()=>{visibility='visible';document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>state.timerActive===false);const idle=await page.evaluate(()=>state.activeMs);await new Promise(r=>setTimeout(r,100));assert.ok(Math.abs(await page.evaluate(()=>state.activeMs)-idle)<2,'Idle time stays paused without a running clock');await page.mouse.move(380,180);await page.waitForFunction(()=>state.timerActive);await page.waitForFunction(before=>state.activeMs>before,idle);
 await page.evaluate(()=>{dispatchEvent(new FocusEvent('blur'));});await page.evaluate(()=>tracker.save());saved=await store.get(url);assert.ok(saved.activeMs>0);const activeBeforeReload=saved.activeMs;await page.reload();await inject({idleMs:160,tickMs:20,flushMs:60});assert.ok(await page.evaluate(()=>state.activeMs)>=activeBeforeReload,'Active reading time persists across reload');
 await page.waitForFunction(()=>state.timerActive);
 await page.evaluate(()=>tracker.toggleReading());
 await page.reload();await inject({idleMs:10000,tickMs:20,flushMs:60});
 assert.equal(await page.evaluate(()=>state.reading),false,'Paused reading stays paused after refresh');
 const paused=await page.evaluate(()=>state.activeMs);
 await page.evaluate(()=>{document.querySelector('main').scrollTop=3500;});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await page.evaluate(()=>state.activeMs),paused);
 assert.equal(await page.evaluate(()=>state.furthestRatio),peak);
 await store.clearPage(url);await page.evaluate(()=>changes.forEach(f=>f({wordReadingProgressV1:{newValue:[]}},'local')));await page.evaluate(()=>{dispatchEvent(new Event('pagehide'));tracker.save();});assert.equal(await store.get(url),null,'Cleared reading data is not recreated by a clock or unload');
 console.log('PASS: highest progress and legacy migration, fast down/back peak, nested-pane last position, reload/unload retention, idempotent cumulative timing, visible/focused/active-only clock, idle pause/resume and cleanup.');
}finally{await browser.close();}
