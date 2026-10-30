import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage();
 await page.setContent('<p id="text">Alpha <em>beta</em> gamma delta</p><p contenteditable="true" id="editor">Editable text</p>');
 await page.addScriptTag({content:await fs.readFile(new URL('../extension/highlighter.js',import.meta.url),'utf8')});
 const result=await page.evaluate(()=>{
  const api=WordHighlighter.create();
  const p=document.getElementById('text'), html=p.innerHTML, height=p.getBoundingClientRect().height;
  function range(startNode,start,endNode,end){const r=document.createRange();r.setStart(startNode,start);r.setEnd(endNode,end);return r;}
  const first=range(p.firstChild,0,p.querySelector('em').firstChild,4);
  const last=range(p.lastChild,7,p.lastChild,12);
  const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
  check(api.supported,'Chrome supports highlights');
  check(api.apply(first,'green'),'cross-element highlight');
  check(api.apply(last,'blue'),'disjoint highlight');
  check(CSS.highlights.size===2,'both highlights retained');
  check(api.apply(first,'pink'),'recolor');
  check(!CSS.highlights.has('word-explainer-green')&&CSS.highlights.has('word-explainer-pink'),'old color replaced');
  check(CSS.highlights.has('word-explainer-blue'),'disjoint highlight preserved');
  const partial=range(p.firstChild,2,p.firstChild,4);
  check(api.remove(partial),'partial overlap removal');
  check(!CSS.highlights.has('word-explainer-pink')&&CSS.highlights.has('word-explainer-blue'),'overlap removed only');
  const adjacent=range(p.lastChild,0,p.lastChild,7);
  api.remove(adjacent);check(CSS.highlights.has('word-explainer-blue'),'touching boundary is not overlap');
  check(!api.apply(first,'<script>'),'invalid color rejected');
  const collapsed=range(p.firstChild,0,p.firstChild,0);check(!api.apply(collapsed,'green'),'collapsed selection rejected');
  const editable=range(document.getElementById('editor').firstChild,0,document.getElementById('editor').firstChild,4);
  check(!api.apply(editable,'green'),'editable selection rejected');
  check(p.innerHTML===html&&p.getBoundingClientRect().height===height,'no DOM or layout changes');
  p.remove();check(!api.apply(first,'green'),'detached range rejected');
  check(!WordHighlighter.create(document,null,null).supported,'unsupported browser handled');
  check(WordHighlighter.colors.length===10,'ten colors');
  for(const [,,hex] of WordHighlighter.colors){
   const values=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
   const luminance=.2126*values[0]+.7152*values[1]+.0722*values[2];
   check(1.05/(luminance+.05)>=4.5,'white text contrast at least 4.5:1: '+hex);
  }
  return true;
 });
 assert.equal(result,true);
 await page.setContent('<p id="sample">Select these words to color.</p>');
 await page.evaluate(()=>{
  const attach=Element.prototype.attachShadow;
  Element.prototype.attachShadow=function(options){const root=attach.call(this,options);window.popupRoot=root;return root;};
  window.chrome={runtime:{id:'test',onMessage:{addListener(fn){window.selectionHandler=fn;}},sendMessage:async()=>({})},storage:{local:{get:async defaults=>defaults},onChanged:{addListener(){}}}};
 });
 await page.addScriptTag({content:await fs.readFile(new URL('../extension/content.js',import.meta.url),'utf8')});
 await page.evaluate(()=>{
  const r=document.createRange();r.selectNodeContents(document.getElementById('sample'));
  getSelection().removeAllRanges();getSelection().addRange(r);
  selectionHandler({type:'SHOW_SELECTION_MENU'},{id:'test'},()=>{});
  const root=window.popupRoot, colors=root.getElementById('highlight-colors').children;
  if(colors.length!==10||colors[0].disabled)throw new Error('picker unavailable');
  getSelection().removeAllRanges(); // Popup actions must use the saved range.
  colors[0].click();
  if(!CSS.highlights.has('word-explainer-green'))throw new Error('picker did not paint saved selection');
  if(colors[0].getAttribute('aria-pressed')!=='true'||colors[0].textContent!=='✓')throw new Error('active color missing');
  colors[3].click();
  if(colors[0].getAttribute('aria-pressed')!=='false'||colors[3].getAttribute('aria-pressed')!=='true')throw new Error('active color did not move');
  if(CSS.highlights.has('word-explainer-green')||!CSS.highlights.has('word-explainer-pink'))throw new Error('picker recolor failed');
  root.getElementById('remove-highlight').click();
  if(CSS.highlights.has('word-explainer-pink'))throw new Error('remove button failed');
 });
 console.log('PASS: popup ten-color picker, saved selection after native selection clears, recolor and remove buttons.');
 console.log('PASS: real Chrome ranges, ten colors, cross-element selection, recolor, overlap removal, disjoint/adjacent preservation, invalid/editable/detached ranges, unchanged DOM/layout, unsupported API.');
} finally {await browser.close();}
