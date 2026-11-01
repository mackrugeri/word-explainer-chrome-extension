(() => {
  const BUILD="0.4.15";
  const pronunciationAndTranslationOnly=typeof location!=="undefined"&&location.hostname==="chatgpt.com";
  let contextSelection="", highlightRange=null, selectionLauncher=null;
  const highlighter=globalThis.WordHighlighter?.createPersistent();
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;z-index:2147483647;display:none";
  globalThis.WordTheme?.register(host);
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `
    <style>
:host{all:initial}*{box-sizing:border-box}[hidden]{display:none!important}
.card{--we-bg:#fff;--we-text:#222e27;--we-muted:#647268;--we-line:#dce3dc;--we-soft:#f3f6f1;--we-accent:#245d47;--we-on-accent:#fff;--we-tint:#e9f2eb;--we-error:#a2352d;width:min(392px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;background:var(--we-bg);color:var(--we-text);border:1px solid var(--we-line);border-radius:14px;box-shadow:0 16px 40px #15271b1a,0 2px 7px #15271b12;font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left;color-scheme:light;-webkit-font-smoothing:antialiased}
.card:focus{outline:none}
:host([data-we-theme="dark"]) .card{--we-bg:#1d2720;--we-text:#ecf0ea;--we-muted:#adbaaf;--we-line:#38473b;--we-soft:#26332a;--we-accent:#b3d8bf;--we-on-accent:#182a1e;--we-tint:#2c3f31;--we-error:#f1a79d;color-scheme:dark}
button{font:inherit;cursor:pointer;transition:background-color .12s,border-color .12s}button:focus-visible,.result-body:focus-visible{outline:3px solid #6ba788;outline-offset:3px}button:disabled{cursor:wait;opacity:.5}.header{display:flex;align-items:center;gap:9px;padding:14px 16px;border-bottom:1px solid var(--we-line);margin-bottom:15px}.mark{display:grid;place-items:center;width:30px;height:30px;flex:none;border:1px solid var(--we-line);background:var(--we-soft);color:var(--we-accent);border-radius:8px;font:650 17px/1 Georgia,serif}.brand-stack{min-width:0;flex:1}.brand{display:block;font-weight:650;font-size:12px}.tagline{display:block;color:var(--we-muted);font-size:10px;margin-top:1px}.settings,.close{display:grid;place-items:center;width:30px;height:30px;flex:none;padding:0;border:0;border-radius:7px;background:transparent;color:var(--we-muted);font-size:18px}.close{font-size:22px}.settings:hover,.close:hover{background:var(--we-soft);color:var(--we-text)}.selection-label{padding:0 16px;margin-bottom:5px;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--we-muted)}.word{margin:0 16px;font-size:18px;line-height:1.45;font-weight:550;overflow-wrap:anywhere;max-height:82px;overflow:auto;scrollbar-width:thin}
.actions{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;padding:14px 16px}.action{min-width:0;min-height:38px;border:1px solid var(--we-line);border-radius:8px;padding:8px;background:var(--we-bg);color:var(--we-text);font-size:12px;font-weight:550;text-align:center}.action:not(.primary):hover{background:var(--we-soft);border-color:var(--we-accent)}.primary{background:var(--we-accent);color:var(--we-on-accent);border-color:var(--we-accent)}.primary:hover{filter:brightness(1.08)}#ask-llm{grid-column:span 3;grid-row:1}#summarize{grid-column:span 3;grid-row:1}#speak,#translate,#notes-taken{grid-column:span 2;grid-row:2}#equation-speak{grid-column:1/-1;grid-row:3;min-height:32px;text-align:left;font-size:11px;color:var(--we-muted)}#paper-explanation{grid-column:1/-1;grid-row:4;text-align:left;font-size:11px;min-height:34px;background:var(--we-soft)}.actions.limited #speak,.actions.limited #translate,.actions.limited #notes-taken{grid-row:1}.actions.limited #equation-speak{grid-row:2}
.highlights{margin:0 16px 12px;padding:10px 11px;background:var(--we-soft);border:1px solid var(--we-line);border-radius:9px}.highlight-header{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px;font-weight:650}.highlight-remove{border:0;background:transparent;color:var(--we-muted);padding:2px 0;font-size:10px}.highlight-remove:hover{color:var(--we-error);text-decoration:underline}.highlight-colors{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:7px;margin-top:9px}.highlight-color{display:grid;place-items:center;min-width:0;width:100%;height:24px;padding:0;border:1px solid #ffffff20;border-radius:6px;color:#fff;font-size:14px;font-weight:700}.highlight-color:hover,.highlight-color[aria-pressed="true"]{outline:2px solid var(--we-accent);outline-offset:2px}.highlight-color:disabled{opacity:.35;cursor:default}.highlight-note{color:var(--we-muted);font-size:10px;line-height:1.4;margin-top:8px}.equation-note{margin:0 16px 12px;font-size:11px;color:var(--we-muted);max-height:100px;overflow:auto;overflow-wrap:anywhere}.equation-note:empty{display:none}.context-action{display:block;margin:0 16px 12px;width:calc(100% - 32px);padding:7px 10px;border:1px solid var(--we-line);border-radius:8px;background:transparent;color:var(--we-muted);font-size:11px;text-align:left}.context-action:hover{background:var(--we-soft);color:var(--we-text)}.llm-choices{padding:0 16px 12px;color:var(--we-muted);font-size:11px}.provider-actions{display:flex;gap:7px;margin-top:7px}.provider-actions .action{flex:1}
.result{margin:0 16px 12px;padding:12px;background:var(--we-bg);border:1px solid var(--we-line);border-radius:9px;overflow:hidden;overscroll-behavior:contain;scrollbar-width:thin}.result-body{max-height:min(250px,45dvh);overflow:auto;overscroll-behavior:contain;scrollbar-width:thin}summary.status{cursor:pointer;margin-bottom:0}details[open] summary.status{margin-bottom:10px}.status{display:flex;align-items:center;gap:7px;color:var(--we-muted);font-size:10px;font-weight:550;line-height:1.5;margin-bottom:10px}#status,#translation-status,#summary-status{flex:1;min-width:0;overflow-wrap:anywhere}.dot{width:5px;height:5px;border-radius:50%;background:var(--we-accent);flex:none}.loading .dot{animation:pulse 1.3s ease-in-out infinite}.error .dot{background:var(--we-error)}.error .status{color:var(--we-error)}.answer{white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px;line-height:1.7}.answer:empty{display:none}.translation{font-family:"Noto Nastaliq Urdu","Noto Naskh Arabic","Geeza Pro",serif;line-height:1.9}.speaker{display:grid;place-items:center;flex:none;width:30px;height:30px;border:1px solid var(--we-line);border-radius:7px;background:var(--we-bg);color:var(--we-accent);padding:0;font-size:14px}.speaker:hover{background:var(--we-tint)}.speech-note{color:var(--we-muted);font-size:11px;margin-top:8px}.speech-note:empty{display:none}.footer{padding:9px 16px;border-top:1px solid var(--we-line);color:var(--we-muted);font-size:10px;display:flex;align-items:center;justify-content:space-between;gap:12px}.version{font-variant-numeric:tabular-nums}#drag-handle{cursor:grab;touch-action:none;user-select:none}#drag-handle:active{cursor:grabbing}@keyframes pulse{50%{opacity:.3}}@media(max-width:340px){.highlight-colors{gap:5px}.highlight-color{height:22px}.word{font-size:16px}}@media(pointer:coarse){.action,.settings,.close,.speaker{min-height:44px}.settings,.close,.speaker{width:38px}}@media(prefers-reduced-motion:reduce){.loading .dot{animation:none}button{transition:none}}
.reading-modes{display:flex;gap:3px;margin:0 16px 14px;padding:3px;border:1px solid var(--we-line);border-radius:8px;background:var(--we-soft)}.reading-modes button{flex:1;border:0;border-radius:5px;padding:6px;background:transparent;color:var(--we-muted);font-size:11px;font-weight:550;min-height:30px}.reading-modes button[aria-pressed="true"]{background:var(--we-bg);color:var(--we-text);box-shadow:0 1px 3px #15271b12}.mode-note{margin:0 16px 12px;font-size:11px;color:var(--we-muted)}
@media(max-width:340px){.actions #speak,.actions #translate,.actions #notes-taken{font-size:11px;padding-inline:4px;white-space:nowrap}.actions #speak .we-button-icon,.actions #translate .we-button-icon,.actions #notes-taken .we-button-icon{width:13px;height:13px;margin-inline-end:4px}}
.actions #llm-choices{grid-column:1/-1;grid-row:2;padding:12px;border:1px solid var(--we-line);border-radius:9px;background:var(--we-soft);font-size:11px}.actions #llm-choices .action{min-height:44px;font-size:13px;line-height:1.5}.actions:has(#llm-choices:not([hidden])) #speak,.actions:has(#llm-choices:not([hidden])) #translate,.actions:has(#llm-choices:not([hidden])) #notes-taken{grid-row:3}.actions:has(#llm-choices:not([hidden])) #equation-speak{grid-row:4}.actions:has(#llm-choices:not([hidden])) #paper-explanation{grid-row:5}
      .selection-reference-list{white-space:normal;font-size:14px;line-height:1.6}.selection-reference-list article{padding:12px 0;border-top:1px solid var(--we-line)}.selection-reference-list a{color:var(--we-accent);font-weight:600}.selection-reference-list small{display:block;color:var(--we-muted);font-size:11px}.selection-reference-list p{margin:6px 0}
${globalThis.WordRichResponse?.css||""}
    </style>
    <section class="card" tabindex="-1" aria-label="Word Explainer">
      <div class="header" id="drag-handle" title="Drag to move"><span class="mark" aria-hidden="true">W</span><div class="brand-stack"><span class="brand">Word Explainer</span><span class="tagline">Selection tools</span></div><button class="settings" id="open-settings" type="button" aria-label="Settings" title="Settings">⚙</button><button class="close" id="close" type="button" aria-label="Close">×</button></div>
      <div class="reading-modes" role="group" aria-label="Reading mode"><button id="reading-mode" type="button" aria-pressed="true">Reading</button><button id="math-mode" type="button" aria-pressed="false">Math article</button></div>
      <div class="selection-label">Selected text</div>
      <div class="word" id="word" dir="auto"></div>
      <div class="actions" id="actions"><button class="action" id="speak" type="button">Listen</button><button class="action" id="equation-speak" type="button" aria-pressed="false">Greek alphabet pronunciation</button><button class="action primary" id="ask-llm" type="button" aria-expanded="false" aria-controls="llm-choices">Ask to LLM</button><div class="llm-choices" id="llm-choices" role="group" aria-label="Choose an AI provider" hidden><span id="provider-label">Choose a provider</span><div class="provider-actions"><button class="action primary" id="explain" type="button">ChatGPT</button><button class="action primary" id="gemini" type="button">Gemini</button></div></div><button class="action" id="translate" type="button">Translate</button><button class="action" id="notes-taken" type="button">Notes Taken</button><button class="action" id="paper-explanation" type="button" aria-label="Explain mathematical equation from this paper" title="Explain this equation in the research paper’s context">Explain mathematical equation from this paper</button><button class="action" id="summarize" type="button">Summarize</button></div>
      <p class="mode-note" id="math-mode-note" role="status" hidden></p>
      <div class="highlights" role="group" aria-label="Highlight selected text"><div class="highlight-header"><span>Highlight</span><button class="highlight-remove" id="remove-highlight" type="button" title="Remove highlights overlapping the selected text">Remove</button></div><div class="highlight-colors" id="highlight-colors"></div><div class="highlight-note" id="highlight-note" role="status" aria-live="polite">Saved locally on this page</div></div>
      <div id="equation-note" class="equation-note" role="status" aria-live="polite"></div>
      <button class="context-action" id="selection-references" type="button">Selection references</button>
      <button class="context-action" id="cross-context" type="button">Cross-page context ↗</button>

      <details class="result" id="result" hidden open><summary class="status"><span class="dot" aria-hidden="true"></span><span id="status">AI explanation</span></summary><div class="result-body" tabindex="0" aria-label="AI explanation"><div class="answer" id="answer" dir="auto"></div></div></details>
      <details class="result" id="references-result" hidden open><summary class="status"><span class="dot" aria-hidden="true"></span><span id="references-status">Selection references</span></summary><div class="result-body" tabindex="0" aria-label="Selection references"><div class="answer" id="references-answer"></div></div></details>
      <details class="result" id="summary-result" hidden open><summary class="status"><span class="dot" aria-hidden="true"></span><span id="summary-status">Summary</span></summary><div class="result-body" tabindex="0" aria-label="Summary"><div class="answer" id="summary-answer" dir="auto"></div></div></details>
      <details class="result" id="translation-result" hidden open><summary class="status"><span class="dot" aria-hidden="true"></span><span id="translation-status">Translation</span></summary><div class="result-body" tabindex="0" aria-label="Translation"><button class="speaker" id="listen-translation" type="button" aria-label="Listen to translation" title="Listen to translation" hidden>🔊</button><div class="answer translation" id="translation-answer" dir="auto"></div><div class="speech-note" id="speech-note" role="status"></div></div></details>
      <div class="footer"><span>Esc to close</span><span class="version">v0.4.15</span></div>
    </section>`;
  globalThis.WordUIIcons?.decorate(root);
  document.documentElement.appendChild(host);
  let settings = { language:"en-US", rate:1, translationLanguage:"Urdu", translationFontSize:20, readingMode:"reading" };
  chrome.storage.local.get(settings).then(value => { settings=value;applyTranslationSize();applyReadingMode(); }).catch(()=>{});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=="local")return;
    for(const key of Object.keys(settings))if(changes[key])settings[key]=changes[key].newValue;
    applyTranslationSize();applyReadingMode();
  });
  let paperSelection="",paperSourceUrl="";
  let selectedText="", activeRequest=null, selectedAction="explain", selectedProvider="chatgpt";
  const answerKey=(text,action,language,provider=selectedProvider)=>`${action}|${action==="paper-explanation"?paperSourceUrl+"|":""}${action==="translate"?language:provider}|${text}`;
  const setBusy=value=>{el("selection-references").disabled=value;el("paper-explanation").disabled=value;el("summarize").disabled=value;el("ask-llm").disabled=value;el("explain").disabled=value;el("gemini").disabled=value;el("translate").disabled=value;};
  async function send(message){
    try {
      if(!chrome.runtime?.id)throw new Error("Extension context invalidated");
      return await chrome.runtime.sendMessage(message);
    } catch(error) {
      if(/context invalidated|extension context/i.test(error?.message||""))
        throw new Error("The extension was updated. Refresh this page and retry.");
      throw error;
    }
  }
  const pending = new Map();
  const answers = new Map();
  const el=(id)=>root.getElementById(id);
  if(pronunciationAndTranslationOnly){el("selection-references").hidden=true;el("paper-explanation").hidden=true;el("cross-context").hidden=true;el("ask-llm").hidden=true;el("summarize").hidden=true;el("actions").className="actions limited";}
  function updateHighlightColor(){
    const active=highlighter?.activeColor(highlightRange);
    for(const button of el("highlight-colors").children||[]){
      const selected=button.dataset.color===active;
      button.setAttribute("aria-pressed",String(selected));button.textContent=selected?"✓":"";
    }
  }
  if(highlighter)for(const [key,label,color] of globalThis.WordHighlighter.colors){
    const button=document.createElement("button");button.type="button";button.className="highlight-color";
    button.style.backgroundColor=color;button.dataset.color=key;button.setAttribute("aria-pressed","false");button.title=label;button.setAttribute("aria-label",`Highlight ${label.toLowerCase()}`);
    button.addEventListener("click",async()=>{
      try{
        const ok=await highlighter.apply(highlightRange,key);updateHighlightColor();
        el("highlight-note").textContent=ok?(highlighter.persistent?`${label} highlight saved locally.`:`${label} highlighted until reload. Refresh the extension to enable saving.`):"Select webpage text again to highlight it.";
      }catch(error){el("highlight-note").textContent=error.message||"Could not save the highlight. Try again.";}
      fitPanel();
    });
    el("highlight-colors").appendChild(button);
  }
  highlighter?.ready?.then(()=>{
    updateHighlightColor();
    if(host.style.display==="block")el("highlight-note").textContent=highlighter.status();
  }).catch(()=>{el("highlight-note").textContent="Could not load saved highlights. Refresh this page to retry.";});
  el("notes-taken").addEventListener("click",()=>{
    if(globalThis.WordNotesPanel?.open(highlightRange))hide();
    else el("highlight-note").textContent="Select a uniquely identifiable passage on this webpage. Notes cannot attach to embedded or native PDF selections.";
  });
  el("remove-highlight").addEventListener("click",async()=>{
    try{
      const ok=await highlighter?.remove(highlightRange);updateHighlightColor();
      el("highlight-note").textContent=ok?"Overlapping highlights removed from saved highlights.":"Select webpage text again to remove highlights.";
    }catch(error){el("highlight-note").textContent=error.message||"Could not remove saved highlights. Try again.";}
  });
  function applyReadingMode(){
    const math=settings.readingMode==="math";
    el("reading-mode").setAttribute("aria-pressed",String(!math));el("math-mode").setAttribute("aria-pressed",String(math));
    el("equation-speak").hidden=!math;el("paper-explanation").hidden=!math||pronunciationAndTranslationOnly;
    const source=paperSelection||contextSelection||selectedText;
    const hasMath=globalThis.WordMathSelection?.isMath(source)??true;
    el("paper-explanation").disabled=!hasMath||!!activeRequest;
    el("math-mode-note").hidden=!math;
    el("math-mode-note").textContent=hasMath?"Select an equation to explain it using this paper.":"Select a mathematical equation first.";
    if(host.style.display==="block")fitPanel();
  }
  for(const [id,mode]of [["reading-mode","reading"],["math-mode","math"]])el(id).addEventListener("click",async()=>{
    settings.readingMode=mode;applyReadingMode();
    try{await chrome.storage.local.set({readingMode:mode});}catch{el("math-mode-note").hidden=false;el("math-mode-note").textContent="Mode changed for this page; could not save the preference.";}
  });
  applyReadingMode();
  let spokenTranslation=null, speechId=null, returnFocus=null, plainUtterance=null;
  const hide=()=>{ host.style.display="none";el("llm-choices").hidden=true;el("ask-llm").setAttribute("aria-expanded","false");stopTranslationSpeech();stopEquationSpeech(); };
  const dismiss=()=>{
    hide();
    if(plainUtterance){plainUtterance=null;speechSynthesis.cancel();}
    if(returnFocus?.isConnected)returnFocus.focus?.({preventScroll:true});
    returnFocus=null;
  };
  function applyTranslationSize(){
    if(!spokenTranslation)return;
    const size=Number(settings.translationFontSize);
    el("translation-answer").style.fontSize=`${Number.isFinite(size)?Math.max(14,Math.min(32,size)):20}px`;
    fitPanel();
  }
  function stopTranslationSpeech(){
    if(speechId)send({type:"STOP_TRANSLATION_SPEECH"}).catch(()=>{});
    speechId=null;el("listen-translation").textContent="🔊";
    el("listen-translation").ariaLabel="Listen to translation";el("listen-translation").title="Listen to translation";
  }
  function fitPanel(){
    const rect=host.getBoundingClientRect();
    host.style.left=`${Math.max(12,Math.min(rect.left,innerWidth-rect.width-12))}px`;
    host.style.top=`${Math.max(12,Math.min(rect.top,innerHeight-rect.height-12))}px`;
  }
  function showSelection(embedded=null){
    selectionLauncher?.hide();
    if(document.activeElement!==host)returnFocus=document.activeElement;
    hide();highlightRange=null;el("equation-note").textContent="";
    // Focus is not the selection: a search field can keep focus while a
    // result snippet elsewhere on the page has a valid text range.
    const selection=embedded?null:window.getSelection();
    paperSelection=embedded?embedded.text:String(selection||"");
    paperSourceUrl=embedded?embedded.sourceUrl:location.href;
    contextSelection=paperSelection.trim();
    selectedText=contextSelection;
    if(!selectedText||(!embedded&&!selection.rangeCount))return false;
    let rect;
    if(embedded){
      const source=new URL(embedded.sourceUrl);
      const frame=[...document.querySelectorAll('iframe')].find(node=>{try{const url=new URL(node.src,location.href);return url.origin===source.origin&&url.pathname===source.pathname;}catch{return false;}});
      const outer=frame?.getBoundingClientRect()||{left:20,top:80};
      rect={left:outer.left+embedded.rect.left,top:outer.top+embedded.rect.top,bottom:outer.top+embedded.rect.bottom};
    }else{
      const range=selection.getRangeAt(0),node=range.commonAncestorContainer;
      const container=node?.nodeType===1?node:node?.parentElement;
      if(container?.isContentEditable||container?.closest?.("input, textarea"))return false;
      highlightRange=range.cloneRange?.()||null;
      rect=range.getBoundingClientRect();
    }
    const canHighlight=!!highlighter?.canHighlight(highlightRange);
    for(const button of el("highlight-colors").children||[])button.disabled=!canHighlight;
    el("remove-highlight").disabled=!canHighlight;updateHighlightColor();
    el("highlight-note").textContent=!highlighter?.supported?"Text highlighting is unavailable in this browser.":embedded?"Highlighting is unavailable for this embedded selection.":canHighlight?(highlighter.status?.()||"Highlighting is available until reload."):"Select non-editable webpage text to highlight.";
    el("word").textContent=selectedText;
    el("result").hidden=true;el("references-result").hidden=true;el("summary-result").hidden=true;el("translation-result").hidden=true;spokenTranslation=null;
    const saved=[...answers.entries()].filter(([key])=>key.endsWith(`|${selectedText}`)).map(([,value])=>value);
    for(const result of saved)if((result.action!=="translate"||result.targetLanguage===settings.translationLanguage)&&(result.action!=="paper-explanation"||result.paperSourceUrl===paperSourceUrl))renderResult(result);
    const running=[...pending.entries()].find(([,job])=>job.text===selectedText);
    activeRequest=running?.[0]||null;
    setBusy(!!running);applyReadingMode();

    if(running){const view=resultView(running[1].action);view.section.hidden=false;view.section.className="result loading";view.status.textContent=running[1].stage||"Waiting for the answer…";}
    expandSection(selectedAction);
    host.style.display="block";
    host.style.left=`${rect.left}px`;
    const height=host.getBoundingClientRect().height;
    host.style.top=`${rect.top>=height+12?rect.top-height-12:rect.bottom+12}px`;
    fitPanel();
    root.querySelector?.(".card")?.focus?.({preventScroll:true});
    return true;
  }
  function resultView(action){
    if(action==="selection-references")return {section:el("references-result"),status:el("references-status"),answer:el("references-answer")};
    if(action==="summarize")return {section:el("summary-result"),status:el("summary-status"),answer:el("summary-answer")};
    const translation=action==="translate";
    return {section:el(translation?"translation-result":"result"),status:el(translation?"translation-status":"status"),answer:el(translation?"translation-answer":"answer")};
  }
  function expandSection(action){
    el("references-result").open=action==="selection-references";
    el("summary-result").open=action==="summarize";el("result").open=action==="explain"||action==="paper-explanation";el("translation-result").open=action==="translate";
  }
  function renderResult(result){
    const view=resultView(result.action);
    view.section.hidden=false;view.section.className=result.ok?"result":"result error";
    view.status.textContent=result.ok?result.label:`${result.action==="translate"?"Translation":result.action==="summarize"?"Summary":result.action==="selection-references"?"Selection references":"AI explanation"} · Unable to finish`;
    if(result.warning)view.status.textContent+=" · "+result.warning;
    if(result.action==="selection-references"&&result.ok&&globalThis.WordSelectionReferences)WordSelectionReferences.render(view.answer,result.text);
    else if(globalThis.WordRichResponse&&result.ok&&result.action!=="translate")WordRichResponse.render(view.answer,result.rich,result.text);
    else {view.answer.textContent=result.ok?result.text:(result.error||"No answer received.");view.answer.classList?.remove("rich-response");}
    if(result.action==="translate"){
      stopTranslationSpeech();
      spokenTranslation=result.ok?{text:result.text,language:result.targetLanguage}:null;
      el("listen-translation").hidden=!spokenTranslation;el("speech-note").textContent="";
      if(spokenTranslation)applyTranslationSize();
    }
    fitPanel();
  }
  function complete(requestId,result){
    const job=pending.get(requestId);
    if(!job)return;
    clearTimeout(job.timer);pending.delete(requestId);
    result={...result,paperSourceUrl:job.paperSourceUrl,action:job.action,provider:job.provider,targetLanguage:job.targetLanguage,label:job.action==="selection-references"?"Selection references · ChatGPT":job.action==="translate"?`Google Translate · ${job.targetLanguage}`:job.action==="summarize"?`Summary · ${job.provider==="gemini"?"Gemini":"ChatGPT"}`:`${job.provider==="gemini"?"Gemini":"ChatGPT"} · explanation`};
    if(result.ok&&["explain","translate","paper-explanation"].includes(job.action))globalThis.WordReviewPanel?.record({pageUrl:job.pageUrl,text:job.text,action:job.action,
      provider:job.provider,language:job.targetLanguage,answer:result.text});
    answers.set(job.key,result);
    if(answers.size>20)answers.delete(answers.keys().next().value);
    if(activeRequest===requestId){
      activeRequest=null;setBusy(false);
      if(selectedText===job.text)renderResult(result);
    }
  }
  chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
    if(sender.id!==chrome.runtime.id)return;
    if(message.type==="TRANSLATION_SPEECH_STATUS"&&message.speechId===speechId){
      if(message.state==="playing"){el("listen-translation").textContent="■";el("listen-translation").ariaLabel="Stop reading translation";el("listen-translation").title="Stop reading translation";el("speech-note").textContent="";}
      else {speechId=null;el("listen-translation").textContent="🔊";el("listen-translation").ariaLabel="Listen to translation";el("listen-translation").title="Listen to translation";el("speech-note").textContent=message.state==="error"?(message.error||"Unable to play audio."):"";}
      sendResponse({received:true});return;
    }
    if(message.type==="READ_PAGE_LOCATION"){sendResponse({ok:true,url:location.href,title:document.title});return;}
    if(message.type==="SHOW_SELECTION_MENU"){
      if(message.build&&message.build!==BUILD){sendResponse({ok:false,error:"Refresh this web page after updating Word Explainer."});return;}
      sendResponse({ok:true,shown:showSelection(),build:BUILD,courseFramesAllowed:typeof location!=="undefined"&&["www.skills.google","skills.google"].includes(location.hostname)});return;
    }
    if(message.type==="SHOW_COURSE_SELECTION_MENU"){
      let allowed=false;try{const url=new URL(message.selection?.sourceUrl);allowed=message.build===BUILD&&["www.skills.google","skills.google"].includes(location.hostname)&&url.origin==="https://storage.googleapis.com"&&url.pathname.startsWith("/cloud-training/")&&typeof message.selection.text==="string"&&message.selection.text.length<=8000&&["left","top","bottom"].every(key=>Number.isFinite(message.selection.rect?.[key]));}catch{}
      sendResponse({ok:allowed,shown:allowed?showSelection(message.selection):false,build:BUILD});return;
    }
    if(message.type==="EXPLANATION_RESULT"){
      complete(message.requestId,message);sendResponse({received:true});return;
    }
    const job=pending.get(message.requestId);
    if(!job)return;
    if(message.type==="EXPLANATION_PROGRESS"||message.type==="EXPLANATION_PARTIAL"){
      job.stage=job.action==="summarize"?`Summary · ${message.stage||"Receiving…"}`:message.stage;
      if(message.requestId===activeRequest&&selectedText===job.text){
        const view=resultView(job.action);view.status.textContent=job.stage;
        if(typeof message.text==="string"&&job.action!=="selection-references"){if(globalThis.WordRichResponse&&job.action!=="translate")WordRichResponse.render(view.answer,message.rich,message.text);else view.answer.textContent=message.text;fitPanel();}
      }
      sendResponse({received:true});
    }
  });
  document.addEventListener("mouseup",event=>{if(!event.composedPath().includes(host))hide();});
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&host.style.display==="block"){event.preventDefault();dismiss();}
  });
  root.addEventListener("keydown",event=>{
    if(event.key!=="Tab")return;
    const stops=[...root.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')].filter(node=>node.getClientRects().length);
    if(!stops.length)return;
    const current=root.activeElement;
    if(event.shiftKey&&(current===stops[0]||!stops.includes(current))){event.preventDefault();stops.at(-1).focus();}
    else if(!event.shiftKey&&current===stops.at(-1)){event.preventDefault();stops[0].focus();}
  });
  document.addEventListener("scroll",event=>{if(!event.composedPath().includes(host))hide();},true);
  window.addEventListener("resize",hide);
  root.addEventListener("mousedown",event=>{if(event.target.closest?.("button"))event.preventDefault();});
  let drag=null;
  const handle=el("drag-handle");
  handle.addEventListener("pointerdown",event=>{
    if(event.button!==0||event.target.closest?.("button"))return;
    const rect=host.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};
    handle.setPointerCapture?.(event.pointerId);event.preventDefault();
  });
  handle.addEventListener("pointermove",event=>{
    if(!drag||event.pointerId!==drag.id)return;
    host.style.left=`${drag.left+event.clientX-drag.x}px`;host.style.top=`${drag.top+event.clientY-drag.y}px`;fitPanel();
  });
  const endDrag=()=>{drag=null;};
  handle.addEventListener("pointerup",endDrag);handle.addEventListener("pointercancel",endDrag);
  el("close").addEventListener("click",dismiss);
  el("open-settings").addEventListener("click",()=>send({type:"OPEN_SETTINGS"}).catch(()=>{}));
  el("listen-translation").addEventListener("click",()=>{
    if(speechId){stopTranslationSpeech();el("speech-note").textContent="";return;}
    if(!spokenTranslation)return;
    const languages={Urdu:"ur",English:"en",Arabic:"ar",French:"fr",Spanish:"es"};
    speechId=crypto.randomUUID?.()||String(Date.now());
    el("speech-note").textContent="Loading audio…";
    send({type:"SPEAK_TRANSLATION",text:spokenTranslation.text,language:languages[spokenTranslation.language]||"ur",
      rate:settings.rate,speechId}).then(ack=>{if(!ack?.accepted)throw new Error("Unable to start audio.");})
      .catch(error=>{speechId=null;el("speech-note").textContent=error.message;});
  });
  let equationUtterance=null;
  function stopEquationSpeech(){
    const previous=equationUtterance;equationUtterance=null;
    el("equation-speak").setAttribute("aria-pressed","false");
    if(previous&&typeof speechSynthesis!=="undefined")speechSynthesis.cancel();
  }
  el("equation-speak").addEventListener("click",()=>{
    if(equationUtterance){stopEquationSpeech();el("equation-note").textContent="Equation pronunciation stopped.";return;}
    const result=globalThis.WordEquationSpeech?.toSpeech(contextSelection||selectedText);
    if(!result?.ok){el("equation-note").textContent=result?.error||"Reload the extension and refresh this page to enable equation pronunciation.";fitPanel();return;}
    if(typeof speechSynthesis==="undefined"||typeof SpeechSynthesisUtterance==="undefined"){
      el("equation-note").textContent="Speech playback is not available in this browser.";fitPanel();return;
    }
    stopTranslationSpeech();speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(result.text);equationUtterance=utterance;
    utterance.lang="en-US";utterance.rate=settings.rate;
    const voices=typeof speechSynthesis.getVoices==="function"?speechSynthesis.getVoices():[];
    const english=voices.find(voice=>/^en(?:-|$)/i.test(voice.lang)&&voice.default)||voices.find(voice=>/^en(?:-|$)/i.test(voice.lang));
    if(english)utterance.voice=english;
    el("equation-speak").setAttribute("aria-pressed","true");
    el("equation-note").textContent="English reading: "+result.text;
    const finish=()=>{if(equationUtterance===utterance){equationUtterance=null;el("equation-speak").setAttribute("aria-pressed","false");}};
    utterance.onend=finish;
    utterance.onerror=event=>{if(equationUtterance!==utterance)return;finish();el("equation-note").textContent=["canceled","interrupted"].includes(event.error)?"Equation pronunciation stopped.":"Could not play the English voice. Check your device speech settings.";};
    try{speechSynthesis.speak(utterance);}catch{finish();el("equation-note").textContent="Speech playback could not start. Try again.";}
    fitPanel();
  });
  el("speak").addEventListener("click",()=>{
    speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(selectedText);
    utterance.lang=settings.language;utterance.rate=settings.rate;plainUtterance=utterance;
    const done=()=>{if(plainUtterance===utterance)plainUtterance=null;};utterance.onend=done;utterance.onerror=done;speechSynthesis.speak(utterance);
  });
  function requestAction(action,provider="chatgpt"){
    if(pronunciationAndTranslationOnly&&action!=="translate")return;
    if(action==="paper-explanation"&&globalThis.WordMathSelection&&!WordMathSelection.isMath(paperSelection||selectedText)){el("math-mode-note").hidden=false;el("math-mode-note").textContent="Select a mathematical equation first.";fitPanel();return;}
    el("llm-choices").hidden=true;el("ask-llm").setAttribute("aria-expanded","false");
    if(["summarize","selection-references"].includes(action)&&selectedText.length>8000){renderResult({action,ok:false,error:"Select up to 8,000 characters and try again."});expandSection(action);return;}
    selectedProvider=provider;
    selectedAction=action;
    if(action==="translate"){stopTranslationSpeech();spokenTranslation=null;el("listen-translation").hidden=true;el("speech-note").textContent="";}
    const requestId=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    activeRequest=requestId;
    const job={text:selectedText,action,provider,paperSourceUrl:action==="paper-explanation"?paperSourceUrl:undefined,pageUrl:typeof location!=="undefined"?location.href.split("#")[0]:"",targetLanguage:settings.translationLanguage,
      key:answerKey(selectedText,action,settings.translationLanguage),
      stage:action==="translate"?`Translating into ${settings.translationLanguage} with Google…`:`${action==="summarize"?"Summary · ":""}Opening ${provider==="gemini"?"Gemini":"ChatGPT"}…`,timer:null};
    pending.set(requestId,job);
    const view=resultView(action);view.section.hidden=false;view.section.className="result loading";
    view.status.textContent=job.stage;view.answer.textContent="";expandSection(action);
    setBusy(true);fitPanel();
    job.timer=setTimeout(()=>{
      complete(requestId,{ok:false,error:"The request timed out. Check the selected AI website and retry."});
      send({type:"CANCEL_EXPLANATION",requestId}).catch(()=>{});
    },155000);
    send({type:action==="selection-references"?"FIND_SELECTION_REFERENCES":action==="paper-explanation"?"EXPLAIN_PAPER_SELECTION":action==="translate"?"TRANSLATE_SELECTION":action==="summarize"?"SUMMARIZE_SELECTION":"EXPLAIN_SELECTION",text:action==="paper-explanation"?paperSelection:["summarize","selection-references"].includes(action)?selectedText:selectedText.slice(0,1000),sourceUrl:action==="paper-explanation"?paperSourceUrl:undefined,requestId,build:BUILD,action,provider,translationLanguage:job.targetLanguage}).then(ack=>{
      if(!ack?.accepted)complete(requestId,{ok:false,error:ack?.error||"The extension could not start the request."});
    }).catch(error=>complete(requestId,{ok:false,error:error.message||"Connection lost. Refresh this page."}));
  }
  el("cross-context").addEventListener("click",async()=>{
    if(pronunciationAndTranslationOnly)return;
    if(contextSelection.length>8000){el("cross-context").textContent="Select up to 8,000 characters";return;}
    const button=el("cross-context");button.disabled=true;
    try{const ack=await send({type:"OPEN_CONTEXTS",text:contextSelection,title:document.title});
      if(!ack?.ok)throw new Error(ack?.error||"Could not open contexts.");hide();
    }catch(error){button.textContent=error.message;}finally{button.disabled=false;}
  });
  el("ask-llm").addEventListener("click",()=>{
    if(pronunciationAndTranslationOnly)return;
    const choices=el("llm-choices");choices.hidden=!choices.hidden;
    el("ask-llm").setAttribute("aria-expanded",String(!choices.hidden));fitPanel();if(!choices.hidden)choices.scrollIntoView?.({block:"nearest"});
  });
  el("paper-explanation").addEventListener("click",()=>requestAction("paper-explanation","chatgpt"));
  el("selection-references").addEventListener("click",()=>requestAction("selection-references","chatgpt"));
  el("summarize").addEventListener("click",()=>requestAction("summarize","chatgpt"));
  el("explain").addEventListener("click",()=>requestAction("explain"));
  el("gemini").addEventListener("click",()=>requestAction("explain","gemini"));
  el("translate").addEventListener("click",()=>requestAction("translate"));
  if(!pronunciationAndTranslationOnly&&window.top===window){globalThis.WordReviewPanel?.useDock?.();globalThis.WordFloatingTools?.create({openSelection:action=>{if(!showSelection())return false;if(action)el(action)?.click();return true;},mountReview:(container,onClose)=>globalThis.WordReviewPanel?.mount?.(container,onClose)||false});}
  globalThis.WordSelectionUI={open:()=>showSelection()};
  selectionLauncher=globalThis.WordSelectionLauncher?.create({open:()=>showSelection(),isPanelOpen:()=>host.style.display==="block"});
})();
