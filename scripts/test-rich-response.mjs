import fs from 'node:fs/promises';import vm from 'node:vm';import assert from 'node:assert/strict';import {createRequire}from'node:module';
const{chromium}=createRequire(import.meta.url)('playwright');const dir=new URL('../extension/',import.meta.url);
const names=['rich-response.js','chatgpt-worker.js','content.js','pdf-panel.html','pdf-panel.css','pdf-panel.js'];
const files=Object.fromEntries(await Promise.all(names.map(async name=>[name,await fs.readFile(new URL(name,dir),'utf8')])));
const fixture=`<div data-message-author-role="assistant"><div class="markdown"><h2>Paper equation</h2><p>The <strong>objective</strong> is <span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><msub><mi>L</mi><mi>i</mi></msub><mo>=</mo><mfrac><msup><mi>x</mi><mn>2</mn></msup><mrow><mi>a</mi><mo>+</mo><mi>b</mi></mrow></mfrac></mrow><annotation encoding="application/x-tex">L_i=\\frac{x^2}{a+b}</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">DUPLICATE VISUAL MATH</span></span>.</p><span class="katex-display"><span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover><msqrt><mrow><mi>a</mi><mo>+</mo><msup><mi>b</mi><mn>2</mn></msup></mrow></msqrt></mrow><annotation encoding="application/x-tex">\\sum_{i=1}^n\\sqrt{a+b^2}</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">DUPLICATE DISPLAY MATH</span></span></span><ul><li>First point</li><li>Second point with <code>x_i</code></li></ul><table><tbody><tr><th>Symbol</th><th>Meaning</th></tr><tr><td>x</td><td>Input</td></tr></tbody></table><p><a href="https://paper.test/section">Paper source</a></p></div></div>`;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:500,height:900}});await page.setContent(fixture);await page.addScriptTag({content:files['rich-response.js']});
 await page.evaluate(()=>{window.events=[];window.chrome={runtime:{id:'test',onMessage:{addListener(){}},sendMessage:async message=>{events.push(message);return message.type==='CHATGPT_RESUME'?{job:{phase:'submitted',task:'paper-explanation',expectedPrompt:'test'}}:{ok:true};}}};});
 await page.addScriptTag({content:files['chatgpt-worker.js']});await page.waitForFunction(()=>events.some(message=>message.type==='CHATGPT_RESULT'));
 const message=await page.evaluate(()=>events.find(message=>message.type==='CHATGPT_RESULT'));assert.equal(message.ok,true);assert.ok(message.rich);assert.ok((await page.evaluate(()=>events.find(message=>message.type==='CHATGPT_PARTIAL'))).rich,'Streaming carries formatting');
 await page.evaluate(rich=>{window.rich=rich;const target=document.createElement('div');target.id='output';target.style.cssText='width:320px;padding:18px;border:1px solid #aaa;font:16px/1.6 system-ui';document.body.replaceChildren(target);const style=document.createElement('style');style.textContent=WordRichResponse.css;document.head.append(style);WordRichResponse.render(target,rich,'fallback');},message.rich);
 assert.equal(await page.locator('#output math').count(),2);assert.equal(await page.locator('#output mfrac').count(),1);assert.equal(await page.locator('#output msup').count(),2);assert.equal(await page.locator('#output msqrt').count(),1);assert.equal(await page.locator('#output .we-math-block').count(),1);assert.equal(await page.locator('#output annotation').count(),0);assert.ok(!(await page.locator('#output').textContent()).includes('DUPLICATE'));assert.equal(await page.locator('#output li').count(),2);assert.equal(await page.locator('#output table').count(),1);assert.equal(await page.locator('#output a').getAttribute('href'),'https://paper.test/section');
 assert.equal(await page.evaluate(()=>{const f=document.querySelector('mfrac').getBoundingClientRect();const x=document.querySelector('msup').getBoundingClientRect();return f.height>x.height&&f.width>0;}),true,'Native fraction is visually stacked');
 await page.screenshot({path:'/tmp/word-explainer-math-preview.png',fullPage:true});
 const safety=await page.evaluate(()=>{
  const input=document.createElement('div');input.innerHTML='<p onclick="alert(1)">Safe <a href="javascript:alert(1)">link</a><img src="https://tracker.test/x"><script>alert(1)</script></p>';
  const ast=WordRichResponse.capture(input),out=document.getElementById('output');WordRichResponse.render(out,ast,'fallback');
  if(out.querySelector('script,img,iframe,[onclick],[href]'))return false;
  if(WordRichResponse.validate({version:1,children:[{tag:'script',children:['alert(1)']}]}))return false;
  if(WordRichResponse.validate({version:1,children:['x'.repeat(12001)]}))return false;
  WordRichResponse.render(out,{version:1,children:[{tag:'iframe',children:[]}]},'<img src=x>');
  return out.textContent==='<img src=x>'&&out.childElementCount===0;
 });assert.equal(safety,true,'Unsafe content rejected or inert; invalid formatting falls back to text');
 // Actual popup streaming/final response rendering with a real selected range.
 await page.setContent('<p id="selection">Selected equation</p>');
 await page.evaluate(()=>{
  const attach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(opts){const root=attach.call(this,opts);window.popup=root;return root;};
  window.chrome={runtime:{id:'test',onMessage:{addListener(fn){window.handler=fn;}},sendMessage:async message=>{window.sent=message;return{accepted:true};}},storage:{local:{get:async defaults=>defaults},onChanged:{addListener(){}}}};
 });
 await page.addScriptTag({content:files['content.js']});
 await page.evaluate(rich=>{
  const selection=getSelection(),range=document.createRange();range.selectNodeContents(document.getElementById('selection'));selection.removeAllRanges();selection.addRange(range);
  handler({type:'SHOW_SELECTION_MENU'},{id:'test'},()=>{});popup.getElementById('explain').click();
  const requestId=sent.requestId;handler({type:'EXPLANATION_PARTIAL',requestId,text:'Equation answer',rich},{id:'test'},()=>{});
  if(popup.getElementById('answer').querySelectorAll('math').length!==2)throw Error('Popup partial math lost');
  handler({type:'EXPLANATION_RESULT',requestId,ok:true,text:'Equation answer',rich},{id:'test'},()=>{});
  if(popup.getElementById('answer').querySelectorAll('math').length!==2)throw Error('Popup final math lost');
 },message.rich);
 // Actual PDF side-panel renders the same native equation structure from stored results.
 const pdf=await browser.newPage({viewport:{width:360,height:800}});
 await pdf.route('https://pdf-panel.test/**',route=>{const name=new URL(route.request().url()).pathname.slice(1);return route.fulfill({body:files[name]||'',contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});});
 await pdf.addInitScript(rich=>{window.chrome={tabs:{query:async()=>[{id:5}],onActivated:{addListener(){}}},runtime:{sendMessage:async()=>({ok:true,record:{id:'selection',text:'Equation',url:'https://paper.test/paper.pdf',results:{'paper-explanation':{type:'EXPLANATION_RESULT',ok:true,text:'Equation answer',rich}}}})},storage:{local:{get:async defaults=>defaults},onChanged:{addListener(){}}}};},message.rich);
 await pdf.goto('https://pdf-panel.test/pdf-panel.html');await pdf.locator('#explanation-answer math').first().waitFor();assert.equal(await pdf.locator('#explanation-answer math').count(),2);assert.equal(await pdf.locator('#explanation-answer mfrac').count(),1);assert.equal(await pdf.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('PASS: real Chrome ChatGPT KaTeX/MathML extraction and streaming, stacked fractions/powers/roots/sums, headings/lists/tables/links, duplicate-free math, actual popup and PDF rendering, mobile containment, inert untrusted content, invalid/oversized payload fallback.');
}finally{await browser.close();}
