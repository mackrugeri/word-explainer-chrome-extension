import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const cleanupScript=await fs.readFile(new URL('../extension/chat-cleanup.js',import.meta.url),'utf8');
async function testExactChatCleanup(mode='success',provider='chatgpt'){
  const prefix=provider==='gemini'?'/app/':'/c/';const hostName=provider==='gemini'?'gemini.google.com':'chatgpt.com';
  let phase=0,clicks=0,t=0;
  const location={hostname:hostName,origin:'https://'+hostName,pathname:prefix+'owned-chat',href:'https://'+hostName+prefix+'owned-chat'};
  const visible={getClientRects:()=>[{}],disabled:false};
  const anchor={href:location.href,getAttribute:()=>prefix+'owned-chat'};
  const menu={...visible,focus:()=>{},dispatchEvent:event=>{if(['pointer-menu','double-toggle-menu'].includes(mode)&&event.type==='pointerdown')phase=1;return true},click:()=>{if(mode==='double-toggle-menu')phase=phase===1?0:1;else if(mode!=='pointer-menu')phase=1;clicks++}};
  const option={...visible,textContent:'Delete',click:()=>{phase=2;clicks++}};
  const wrapper={...visible,textContent:'Delete',closest:()=>wrapper,contains:node=>node===option};
  const portal={...visible,querySelectorAll:()=>[wrapper,option]};
  if(['nested-delete','nested-menuitems'].includes(mode)){option.closest=()=>wrapper;option.tagName='BUTTON';}
  if(mode==='nested-menuitems'){option.closest=()=>option;option.tagName='DIV';}
  if(mode==='shortcut-delete')option.textContent='Delete ⌘⌫';
  const confirm={...visible,textContent:'Delete',click:()=>{phase=3;clicks++;location.pathname='/'}};
  const dialog={...visible,textContent:'Delete this chat?',querySelectorAll:()=>[confirm]};
  const row={parentElement:null,querySelectorAll:()=>[anchor],querySelector:()=>menu};anchor.parentElement=row;
  const document={querySelectorAll:selector=>{
    if((selector.includes('data-message')||selector.includes('user-query')))return[{getAttribute:key=>mode==='role-heading'&&key==='data-conversation-role'?'user':null,parentElement:mode==='role-heading'?{innerText:'You said Explain borrower.',querySelectorAll:()=>[{innerText:'Explain borrower.'}]}:null,innerText:mode==='role-heading'?'You said':mode==='gemini-a11y-label'?'You said Explain borrower. Explain borrower.':mode==='wrong-prompt'?'A personal conversation':mode==='decorated-prompt'?'You said Explain borrower.':'Explain borrower.',querySelectorAll:selector=>mode==='decorated-prompt'?[{innerText:'Explain borrower.'}]:mode==='gemini-a11y-label'&&selector==='.query-text-line'?[{textContent:'Explain'},{textContent:'borrower.'}]:[]}];
    if(selector==='a[href]')return mode==='missing-row'||phase===3?[]:mode==='with-skip-link'?[{href:location.href+'#skip',parentElement:null},anchor]:[anchor];
    if(selector==='[role="menu"], [data-radix-menu-content]')return ['nested-delete','nested-menuitems'].includes(mode)&&phase===1?[portal]:[];
    if(selector==='[role="menuitem"]')return phase===1?(mode==='ambiguous-menu'?[option,{...option}]:[option]):[];
    if(selector.includes('alertdialog'))return phase===2?[dialog]:[];
    return[];
  }};
  const scope={URL,document,location,PointerEvent:class{constructor(type,options){this.type=type;Object.assign(this,options)}},MouseEvent:class{constructor(type,options){this.type=type;Object.assign(this,options)}},Date:{now:()=>{t+=200;return t}},setTimeout:fn=>fn()};vm.runInNewContext(cleanupScript,scope);
  const result=await scope.WordChatCleanup.remove(prefix+(mode==='wrong-path'?'other-chat':'owned-chat'),'Explain borrower.');
  assert.equal(result.deleted,['success','decorated-prompt','role-heading','with-skip-link','pointer-menu','double-toggle-menu','nested-delete','nested-menuitems','shortcut-delete','gemini-a11y-label'].includes(mode));assert.equal(clicks,['success','decorated-prompt','role-heading','with-skip-link','pointer-menu','double-toggle-menu','nested-delete','nested-menuitems','shortcut-delete','gemini-a11y-label'].includes(mode)?(['pointer-menu','double-toggle-menu'].includes(mode)?2:3):mode==='ambiguous-menu'?1:0);
}

for(const provider of ['chatgpt','gemini']) for(const mode of ['success','wrong-path','wrong-prompt','missing-row','ambiguous-menu','nested-delete','nested-menuitems','shortcut-delete','pointer-menu','double-toggle-menu']) await testExactChatCleanup(mode,provider);
console.log('PASS: nested menuitem chains count once; sibling Delete actions refused; exact path/prompt guards; pointer and click menus; both providers.');
