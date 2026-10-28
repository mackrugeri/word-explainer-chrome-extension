(() => {
  const BUILD="0.1.5";
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
      .actions { display:grid;grid-template-columns:1fr 1.55fr 1fr;gap:8px;padding:16px 18px; }
      .action { min-width:0;min-height:42px;border:1px solid var(--we-line);border-radius:11px;
        padding:9px 8px;background:var(--we-bg);color:var(--we-text);font-size:13px;font-weight:550;text-align:center; }
      .primary { background:var(--we-accent);color:var(--we-on-accent);border-color:var(--we-accent); }
      .action:not(.primary):hover { background:var(--we-soft);border-color:var(--we-accent); }
      .primary:hover { filter:brightness(1.08); }
      .action:disabled { cursor:wait;opacity:.55; }
      button:focus-visible { outline:3px solid #77baa0;outline-offset:3px; }
      .result { margin:0 18px 16px;padding:14px;background:var(--we-soft);border:1px solid var(--we-line);border-radius:13px;
        max-height:min(300px,calc(100dvh - 210px));overflow:auto;overscroll-behavior:contain;scrollbar-width:thin; }
      [hidden] { display:none!important; }
      .status { display:flex;align-items:center;gap:8px;color:var(--we-muted);font-size:11px;font-weight:550;
        line-height:1.5;margin-bottom:10px; }
      #status { flex:1;min-width:0;overflow-wrap:anywhere; }
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
      .version { font-variant-numeric:tabular-nums; }
      @keyframes pulse { 50% { opacity:.3; } }
      @media(max-width:360px) { .actions { grid-template-columns:1fr 1fr; }
        .primary { grid-column:1 / -1;grid-row:2; } }
      @media(pointer:coarse) { .action,.settings,.close,.speaker { min-height:44px; }.settings,.close,.speaker { width:44px; } }
      @media(prefers-reduced-motion:reduce) { .loading .dot { animation:none; }button { transition:none; } }
      @media(prefers-color-scheme:dark) { .card { --we-bg:#18231f;--we-text:#edf4ef;--we-muted:#a5b9ae;
        --we-line:#35463b;--we-soft:#202f27;--we-accent:#a4d7b8;--we-on-accent:#142b1d;--we-tint:#2a4031;
        --we-error:#f2a99e;color-scheme:dark; } }
    </style>
    <section class="card" aria-label="Word Explainer">
      <div class="header"><span class="mark" aria-hidden="true">W</span><div class="brand-stack"><span class="brand">Word Explainer</span><span class="tagline">A little clarity, right here.</span></div><button class="settings" id="open-settings" type="button" aria-label="Settings" title="Settings">⚙</button><button class="close" id="close" type="button" aria-label="Close">×</button></div>
      <div class="selection-label">Selected text</div>
      <div class="word" id="word" dir="auto"></div>
      <div class="actions"><button class="action" id="speak" type="button">Listen</button><button class="action primary" id="explain" type="button">Ask to ChatGPT</button><button class="action" id="translate" type="button">Translate</button></div>
      <div class="result" id="result" aria-live="polite" hidden><div class="status"><span class="dot" aria-hidden="true"></span><span id="status"></span><button class="speaker" id="listen-translation" type="button" aria-label="Listen to translation" title="Listen to translation" hidden>🔊</button></div><div class="answer" id="answer" dir="auto"></div><div class="speech-note" id="speech-note" role="status"></div></div>
      <div class="footer"><span>Esc to close</span><span class="version">v0.1.5</span></div>
    </section>`;
  document.documentElement.appendChild(host);
  let settings = { language:"en-US", rate:1, translationLanguage:"Urdu", translationFontSize:20 };
  chrome.storage.local.get(settings).then(value => { settings=value;applyTranslationSize(); }).catch(()=>{});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=="local")return;
    for(const key of Object.keys(settings))if(changes[key])settings[key]=changes[key].newValue;
    applyTranslationSize();
  });
  let selectedText="", activeRequest=null, selectedAction="explain";
  const answerKey=(text,action,language)=>`${action}|${action==="translate"?language:""}|${text}`;
  const setBusy=value=>{el("explain").disabled=value;el("translate").disabled=value;};
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
  let spokenTranslation=null, speechId=null;
  const hide=()=>{ host.style.display="none";stopTranslationSpeech(); };
  function applyTranslationSize(){
    if(!spokenTranslation)return;
    const size=Number(settings.translationFontSize);
    el("answer").style.fontSize=`${Number.isFinite(size)?Math.max(14,Math.min(32,size)):20}px`;
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
    hide();
    const active=document.activeElement;
    if(active?.matches("input, textarea")||active?.isContentEditable)return;
    const selection=window.getSelection();
    selectedText=String(selection||"").trim().slice(0,1000);
    if(!selectedText||!selection.rangeCount)return;
    const rect=selection.getRangeAt(0).getBoundingClientRect();
    el("word").textContent=selectedText;
    el("result").hidden=true;
    const saved=answers.get(answerKey(selectedText,selectedAction,settings.translationLanguage));
    const running=[...pending.entries()].find(([,job])=>job.text===selectedText);
    activeRequest=running?.[0]||null;
    setBusy(!!running);
    if(saved)renderResult(saved);
    if(running){el("result").hidden=false;el("result").className="result loading";
      el("status").textContent=running[1].stage||"Waiting for ChatGPT…";}
    host.style.display="block";
    host.style.left=`${rect.left}px`;
    const height=host.getBoundingClientRect().height;
    host.style.top=`${rect.top>=height+12?rect.top-height-12:rect.bottom+12}px`;
    fitPanel();
  }
  function renderResult(result){
    el("result").hidden=false;
    el("result").className=result.ok?"result":"result error";
    el("status").textContent=result.ok?(result.label||"ChatGPT · explanation"):"Unable to finish";
    stopTranslationSpeech();
    spokenTranslation=result.ok&&result.action==="translate"?{text:result.text,language:result.targetLanguage}:null;
    el("listen-translation").hidden=!spokenTranslation;el("speech-note").textContent="";
    el("answer").textContent=result.ok?result.text:(result.error||"No answer received.");
    el("answer").className=spokenTranslation?"answer translation":"answer";
    el("answer").style.fontSize=spokenTranslation?"20px":"16px";
    if(spokenTranslation)applyTranslationSize();
    fitPanel();
  }
  function complete(requestId,result){
    const job=pending.get(requestId);
    if(!job)return;
    clearTimeout(job.timer);pending.delete(requestId);
    result={...result,action:job.action,targetLanguage:job.targetLanguage,label:job.action==="translate"?`Google Translate · ${job.targetLanguage}`:"ChatGPT · explanation"};
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
    if(message.type==="SHOW_SELECTION_MENU"){showSelection();sendResponse({ok:true});return;}
    if(message.type==="EXPLANATION_RESULT"){
      complete(message.requestId,message);sendResponse({received:true});return;
    }
    const job=pending.get(message.requestId);
    if(!job)return;
    if(message.type==="EXPLANATION_PROGRESS"||message.type==="EXPLANATION_PARTIAL"){
      job.stage=message.stage;
      if(message.requestId===activeRequest&&selectedText===job.text){
        el("status").textContent=message.stage;
        if(typeof message.text==="string"){el("answer").textContent=message.text;fitPanel();}
      }
      sendResponse({received:true});
    }
  });
  document.addEventListener("mouseup",event=>{if(!event.composedPath().includes(host))hide();});
  document.addEventListener("keyup",event=>{if(event.key==="Escape")hide();});
  document.addEventListener("scroll",event=>{if(!event.composedPath().includes(host))hide();},true);
  window.addEventListener("resize",hide);
  root.addEventListener("mousedown",event=>{if(event.target.closest?.("button"))event.preventDefault();});
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
  el("speak").addEventListener("click",()=>{
    speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(selectedText);
    utterance.lang=settings.language;utterance.rate=settings.rate;speechSynthesis.speak(utterance);
  });
  function requestAction(action){
    selectedAction=action;
    stopTranslationSpeech();spokenTranslation=null;el("listen-translation").hidden=true;
    el("speech-note").textContent="";el("answer").className="answer";el("answer").style.fontSize="16px";
    const requestId=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    activeRequest=requestId;
    const job={text:selectedText,action,targetLanguage:settings.translationLanguage,
      key:answerKey(selectedText,action,settings.translationLanguage),
      stage:action==="translate"?`Translating into ${settings.translationLanguage} with Google…`:"Opening ChatGPT…",timer:null};
    pending.set(requestId,job);
    el("result").hidden=false;el("result").className="result loading";
    el("status").textContent=job.stage;el("answer").textContent="";
    setBusy(true);fitPanel();
    job.timer=setTimeout(()=>{
      complete(requestId,{ok:false,error:"The request timed out. Check ChatGPT and retry."});
      send({type:"CANCEL_EXPLANATION",requestId}).catch(()=>{});
    },155000);
    send({type:action==="translate"?"TRANSLATE_SELECTION":"EXPLAIN_SELECTION",text:selectedText,requestId,build:BUILD,action,translationLanguage:job.targetLanguage}).then(ack=>{
      if(!ack?.accepted)complete(requestId,{ok:false,error:ack?.error||"The extension could not start the request."});
    }).catch(error=>complete(requestId,{ok:false,error:error.message||"Connection lost. Refresh this page."}));
  }
  el("explain").addEventListener("click",()=>requestAction("explain"));
  el("translate").addEventListener("click",()=>requestAction("translate"));
})();
