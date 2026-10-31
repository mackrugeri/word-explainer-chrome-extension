import fs from 'node:fs/promises';import assert from 'node:assert/strict';import{createRequire}from'node:module';
const{chromium}=createRequire(import.meta.url)('playwright');const code=await fs.readFile(new URL('../extension/chat-cleanup.js',import.meta.url),'utf8');
const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const mode of ['hidden-copy','linked-menu','ambiguous']){
 const page=await browser.newPage();await page.route('https://chatgpt.com/**',route=>route.fulfill({contentType:'text/html',body:'<div data-message-author-role="user">Fixture prompt</div><div id="row"><a href="/c/fixture">Fixture chat</a><button aria-label="Chat actions" id="trigger">Actions</button></div>'}));await page.goto('https://chatgpt.com/c/fixture');
 await page.evaluate(mode=>{
 const trigger=document.getElementById('trigger');if(mode==='linked-menu')trigger.setAttribute('aria-controls','owned-menu');
 trigger.onclick=()=>{
 trigger.setAttribute('aria-expanded','true');
 const menu=document.createElement('div');menu.id='owned-menu';menu.setAttribute('role','menu');
 menu.innerHTML='<button role="menuitem">Delete</button>';menu.firstChild.onclick=()=>{
 const dialog=document.createElement('div');dialog.setAttribute('role','dialog');dialog.innerHTML='Delete this chat?<button>Delete</button>';dialog.querySelector('button').onclick=()=>{document.getElementById('row').remove();history.pushState({},'', '/');dialog.remove();};document.body.append(dialog);};document.body.append(menu);
 const duplicate=document.createElement('div');duplicate.setAttribute('role','menu');duplicate.innerHTML='<button role="menuitem">Delete</button>';if(mode==='hidden-copy')duplicate.style.visibility='hidden';duplicate.firstChild.onclick=()=>{throw Error('Wrong action clicked')};document.body.append(duplicate);
 };
 },mode);
 await page.addScriptTag({content:code});const result=await page.evaluate(()=>WordChatCleanup.remove('/c/fixture','Fixture prompt'));assert.equal(result.deleted,mode!=='ambiguous',JSON.stringify(result));if(mode==='ambiguous')assert.match(result.error,/distinct Delete actions=2/);await page.close();
 }
 console.log('PASS: real Chrome hidden duplicate excluded, trigger-linked menu targeted, distinct visible sibling actions refused with diagnostics; all mutations use intercepted test fixtures.');
}finally{await browser.close();}
