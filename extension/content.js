(() => {
  const BUILD="0.3.4";
  const pronunciationAndTranslationOnly=typeof location!=="undefined"&&location.hostname==="chatgpt.com";
  let contextSelection="";
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;z-index:2147483647;display:none";
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `
    <style>
      :host { all:initial; }
      * { box-sizing:border-box; }
      .card { --we-bg:#fff;--we-text:#19332e;--we-muted:#61756f;--we-line:#e0e9e4;
        --we-soft:#f4f8f5;--we-accent:#16654f;--we-on-accent:#fff;--we-tint:#e7f3ec;--we-error:#a93d32;
        width:min(392px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;
        overscroll-behavior:contain;scrollbar-width:thin;background:var(--we-bg);color:var(--we-text);
        border:1px solid var(--we-line);border-radius:20px;box-shadow:0 16px 48px #142e3326,0 2px 8px #142e3310;
        font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left;color-scheme:light; }
      .header { display:flex;align-items:center;gap:10px;padding:16px 18px 14px; }
      .mark { display:grid;place-items:center;width:34px;height:34px;flex:none;background:var(--we-tint);
        color:var(--we-accent);border-radius:11px;font:650 17px/1 Georgia,serif; }
      .brand-stack { min-width:0;flex:1; }
      .brand { display:block;font-weight:650;font-size:13px;letter-spacing:.1px; }
      .tagline { display:block;color:var(--we-muted);font-size:11px;margin-top:1px; }
      button { font:inherit;cursor:pointer;transition:background .15s,border-color .15s; }
      .settings,.close { display:grid;place-items:center;width:32px;height:32px;flex:none;padding:0;
        border:1px solid transparent;border-radius:9px;background:transparent;color:var(--we-muted);font-size:19px; }
      .close { font-size:23px; }
      .settings:hover,.close:hover { background:var(--we-soft);border-color:var(--we-line);color:var(--we-text); }
      .selection-label { padding:0 18px;margin-bottom:5px;font-size:10px;font-weight:650;letter-spacing:1.1px;
        text-transform:uppercase;color:var(--we-muted); }
      .word { margin:0 18px;font-size:23px;line-height:1.35;font-weight:600;overflow-wrap:anywhere;
        max-height:96px;overflow:auto;scrollbar-width:thin; }
      .actions { display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:16px 18px; }
      .actions.limited { grid-template-columns:1fr 1fr; }
      .actions.limited #translate { grid-column:1 / -1; }
      .equation-note { margin:0 18px 12px;font-size:12px;color:var(--we-muted);max-height:100px;overflow:auto;overflow-wrap:anywhere; }
      .equation-note:empty { display:none; }
      .action { min-width:0;min-height:42px;border:1px solid var(--we-line);border-radius:11px;
        padding:9px 8px;background:var(--we-bg);color:var(--we-text);font-size:13px;font-weight:550;text-align:center; }
      .primary { background:var(--we-accent);color:var(--we-on-accent);border-color:var(--we-accent); }
      .action:not(.primary):hover { background:var(--we-soft);border-color:var(--we-accent); }
      .primary:hover { filter:brightness(1.08); }
      .action:disabled { cursor:wait;opacity:.55; }
      button:focus-visible { outline:3px solid #77baa0;outline-offset:3px; }
      .result { margin:0 18px 16px;padding:14px;background:var(--we-soft);border:1px solid var(--we-line);border-radius:13px;
        overflow:hidden;overscroll-behavior:contain;scrollbar-width:thin; }
      .result-body { max-height:min(180px,35dvh);overflow:auto;overscroll-behavior:contain;scrollbar-width:thin; }
      summary.status { cursor:pointer;list-style:disclosure-closed;margin-bottom:0; }
      details[open] summary.status { margin-bottom:10px;list-style:disclosure-open; }
      #drag-handle { cursor:grab;touch-action:none;user-select:none; }
      #drag-handle:active { cursor:grabbing; }
      [hidden] { display:none!important; }
      .status { display:flex;align-items:center;gap:8px;color:var(--we-muted);font-size:11px;font-weight:550;
        line-height:1.5;margin-bottom:10px; }
      #status,#translation-status { flex:1;min-width:0;overflow-wrap:anywhere; }
      .dot { width:6px;height:6px;border-radius:50%;background:var(--we-accent);flex:none; }
      .loading .dot { animation:pulse 1.3s ease-in-out infinite; }
      .error .dot { background:var(--we-error); }
      .error .status { color:var(--we-error); }
      .answer { white-space:pre-wrap;overflow-wrap:anywhere;font-size:16px;line-height:1.65; }
      .answer:empty { display:none; }
      .translation { font-family:"Noto Nastaliq Urdu","Noto Naskh Arabic","Geeza Pro",serif;line-height:1.9; }
      .speaker { display:grid;place-items:center;flex:none;width:32px;height:32px;border:1px solid var(--we-line);
        border-radius:9px;background:var(--we-bg);color:var(--we-accent);padding:0;font-size:15px; }
      .speaker:hover { background:var(--we-tint); }
      .speech-note { color:var(--we-muted);font-size:12px;margin-top:8px; }
      .speech-note:empty { display:none; }
      .footer { padding:10px 18px;background:var(--we-soft);border-top:1px solid var(--we-line);
        color:var(--we-muted);font-size:10px;display:flex;align-items:center;justify-content:space-between;gap:12px; }
      .context-action { display:block;margin:0 18px 14px;width:calc(100% - 36px);padding:8px;border:1px solid var(--we-line);border-radius:10px;background:var(--we-soft);color:var(--we-accent);font-size:12px; }
      .llm-choices { padding:0 18px 14px;color:var(--we-muted);font-size:12px; }
      .llm-choices[hidden] { display:none; }
      .provider-actions { display:flex;gap:8px;margin-top:8px; }
      .provider-actions .action { flex:1; }
      .version { font-variant-numeric:tabular-nums; }
      @keyframes pulse { 50% { opacity:.3; } }
      @media(max-width:360px) { .actions { grid-template-columns:1fr 1fr; }
        .primary { grid-column:auto;grid-row:auto; } }
      @media(pointer:coarse) { .action,.settings,.close,.speaker { min-height:44px; }.settings,.close,.speaker { width:44px; } }
      @media(prefers-reduced-motion:reduce) { .loading .dot { animation:none; }button { transition:none; } }
      @media(prefers-color-scheme:dark) { .card { --we-bg:#18231f;--we-text:#edf4ef;--we-muted:#a5b9ae;
        --we-line:#35463b;--we-soft:#202f27;--we-accent:#a4d7b8;--we-on-accent:#142b1d;--we-tint:#2a4031;
        --we-error:#f2a99e;color-scheme:dark; } }
    </style>
    <section class="card" aria-label="Word Explainer">
      <div class="header" id="drag-handle" title="Drag to move"><span class="mark" aria-hidden="true">W</span><div class="brand-stack"><span class="brand">Word Explainer</span><span class="tagline">A little clarity, right here.</span></div><button class="settings" id="open-settings" type="button" aria-label="Settings" title="Settings">⚙</button><button class="close" id="close" type="button" aria-label="Close">×</button></div>
      <div class="selection-label">Selected text</div>
      <div class="word" id="word" dir="auto"></div>
      <div class="actions" id="actions"><button class="action" id="speak" type="button">Listen</button><button class="action" id="equation-speak" type="button" aria-pressed="false">Equation Pronunciation</button><button class="action primary" id="ask-llm" type="button" aria-expanded="false" aria-controls="llm-choices">Ask to LLM</button><button class="action" id="translate" type="button">Translate</button></div>
      <div id="equation-note" class="equation-note" role="status" aria-live="polite"></div>
      <button class="context-action" id="cross-context" type="button">Cross-page context ↗</button>
      <div class="llm-choices" id="llm-choices" role="group" aria-label="Choose an AI provider" hidden><span>Ask which AI?</span><div class="provider-actions"><button class="action primary" id="explain" type="button">ChatGPT</button><button class="action primary" id="gemini" type="button">Gemini</button></div></div>
      <details class="result" id="result" hidden open><summary class="status"><span class="dot" aria-hidden="true"></span><span id="status">AI explanation</span></summary><div class="result-body" tabindex="0" aria-label="AI explanation"><div class="answer" id="answer" dir="auto"></div></div></details>
      <details class="result" id="translation-result" hidden open><summary class="status"><span class="dot" aria-hidden="true"></span><span id="translation-status">Translation</span></summary><div class="result-body" tabindex="0" aria-label="Translation"><button class="speaker" id="listen-translation" type="button" aria-label="Listen to translation" title="Listen to translation" hidden>🔊</button><div class="answer translation" id="translation-answer" dir="auto"></div><div class="speech-note" id="speech-note" role="status"></div></div></details>
      <div class="footer"><span>Esc to close</span><span class="version">v0.3.4</span></div>
    </section>`;
  document.documentElement.appendChild(host);
  let settings = { language:"en-US", rate:1, translationLanguage:"Urdu", translationFontSize:20 };
  chrome.storage.local.get(settings).then(value => { settings=value;applyTranslationSize(); }).catch(()=>{});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=="local")return;
    for(const key of Object.keys(settings))if(changes[key])settings[key]=changes[key].newValue;
    applyTranslationSize();
  });
  let selectedText="", activeRequest=null, selectedAction="explain", selectedProvider="chatgpt";
  const answerKey=(text,action,language,provider=selectedProvider)=>`${action}|${action==="translate"?language:provider}|${text}`;
  const setBusy=value=>{el("ask-llm").disabled=value;el("explain").disabled=value;el("gemini").disabled=value;el("translate").disabled=value;};
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
  if(pronunciationAndTranslationOnly){el("cross-context").hidden=true;el("ask-llm").hidden=true;el("actions").className="actions limited";}
  let spokenTranslation=null, speechId=null;
  const hide=()=>{ host.style.display="none";el("llm-choices").hidden=true;el("ask-llm").setAttribute("aria-expanded","false");stopTranslationSpeech();stopEquationSpeech(); };
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
  function showSelection(){
    hide();el("equation-note").textContent="";
    // Focus is not the selection: a search field can keep focus while a
    // result snippet elsewhere on the page has a valid text range.
    const selection=window.getSelection();
    contextSelection=String(selection||"").trim();
    selectedText=contextSelection.slice(0,1000);
    if(!selectedText||!selection.rangeCount)return false;
    const range=selection.getRangeAt(0);
    const node=range.commonAncestorContainer;
    const container=node?.nodeType===1?node:node?.parentElement;
    // Keep the existing editable-field boundary, checking the actual range.
    if(container?.isContentEditable||container?.closest?.("input, textarea"))return false;
    const rect=range.getBoundingClientRect();
    el("word").textContent=selectedText;
    el("result").hidden=true;el("translation-result").hidden=true;spokenTranslation=null;
    const saved=[...answers.entries()].filter(([key])=>key.endsWith(`|${selectedText}`)).map(([,value])=>value);
    for(const result of saved)if(result.action!=="translate"||result.targetLanguage===settings.translationLanguage)renderResult(result);
    const running=[...pending.entries()].find(([,job])=>job.text===selectedText);
    activeRequest=running?.[0]||null;
    setBusy(!!running);

    if(running){const view=resultView(running[1].action);view.section.hidden=false;view.section.className="result loading";view.status.textContent=running[1].stage||"Waiting for the answer…";}
    expandSection(selectedAction);
    host.style.display="block";
    host.style.left=`${rect.left}px`;
    const height=host.getBoundingClientRect().height;
    host.style.top=`${rect.top>=height+12?rect.top-height-12:rect.bottom+12}px`;
    fitPanel();
    return true;
  }
  function resultView(action){
    const translation=action==="translate";
    return {section:el(translation?"translation-result":"result"),status:el(translation?"translation-status":"status"),answer:el(translation?"translation-answer":"answer")};
  }
  function expandSection(action){
    el("result").open=action!=="translate";el("translation-result").open=action==="translate";
  }
  function renderResult(result){
    const view=resultView(result.action);
    view.section.hidden=false;view.section.className=result.ok?"result":"result error";
    view.status.textContent=result.ok?result.label:`${result.action==="translate"?"Translation":"AI explanation"} · Unable to finish`;
    if(result.warning)view.status.textContent+=" · "+result.warning;
    view.answer.textContent=result.ok?result.text:(result.error||"No answer received.");
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
    result={...result,action:job.action,provider:job.provider,targetLanguage:job.targetLanguage,label:job.action==="translate"?`Google Translate · ${job.targetLanguage}`:`${job.provider==="gemini"?"Gemini":"ChatGPT"} · explanation`};
    if(result.ok)globalThis.WordReviewPanel?.record({pageUrl:job.pageUrl,text:job.text,action:job.action,
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
    if(message.type==="SHOW_SELECTION_MENU"){
      if(message.build&&message.build!==BUILD){sendResponse({ok:false,error:"Refresh this web page after updating Word Explainer."});return;}
      sendResponse({ok:true,shown:showSelection(),build:BUILD});return;
    }
    if(message.type==="EXPLANATION_RESULT"){
      complete(message.requestId,message);sendResponse({received:true});return;
    }
    const job=pending.get(message.requestId);
    if(!job)return;
    if(message.type==="EXPLANATION_PROGRESS"||message.type==="EXPLANATION_PARTIAL"){
      job.stage=message.stage;
      if(message.requestId===activeRequest&&selectedText===job.text){
        const view=resultView(job.action);view.status.textContent=message.stage;
        if(typeof message.text==="string"){view.answer.textContent=message.text;fitPanel();}
      }
      sendResponse({received:true});
    }
  });
  document.addEventListener("mouseup",event=>{if(!event.composedPath().includes(host))hide();});
  document.addEventListener("keyup",event=>{if(event.key==="Escape")hide();});
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
  el("close").addEventListener("click",hide);
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
    utterance.lang=settings.language;utterance.rate=settings.rate;speechSynthesis.speak(utterance);
  });
  function requestAction(action,provider="chatgpt"){
    if(pronunciationAndTranslationOnly&&action!=="translate")return;
    el("llm-choices").hidden=true;el("ask-llm").setAttribute("aria-expanded","false");
    selectedProvider=provider;
    selectedAction=action;
    if(action==="translate"){stopTranslationSpeech();spokenTranslation=null;el("listen-translation").hidden=true;el("speech-note").textContent="";}
    const requestId=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    activeRequest=requestId;
    const job={text:selectedText,action,provider,pageUrl:typeof location!=="undefined"?location.href.split("#")[0]:"",targetLanguage:settings.translationLanguage,
      key:answerKey(selectedText,action,settings.translationLanguage),
      stage:action==="translate"?`Translating into ${settings.translationLanguage} with Google…`:`Opening ${provider==="gemini"?"Gemini":"ChatGPT"}…`,timer:null};
    pending.set(requestId,job);
    const view=resultView(action);view.section.hidden=false;view.section.className="result loading";
    view.status.textContent=job.stage;view.answer.textContent="";expandSection(action);
    setBusy(true);fitPanel();
    job.timer=setTimeout(()=>{
      complete(requestId,{ok:false,error:"The request timed out. Check the selected AI website and retry."});
      send({type:"CANCEL_EXPLANATION",requestId}).catch(()=>{});
    },155000);
    send({type:action==="translate"?"TRANSLATE_SELECTION":"EXPLAIN_SELECTION",text:selectedText,requestId,build:BUILD,action,provider,translationLanguage:job.targetLanguage}).then(ack=>{
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
    el("ask-llm").setAttribute("aria-expanded",String(!choices.hidden));fitPanel();
  });
  el("explain").addEventListener("click",()=>requestAction("explain"));
  el("gemini").addEventListener("click",()=>requestAction("explain","gemini"));
  el("translate").addEventListener("click",()=>requestAction("translate"));
})();
