(() => {
  const el=id=>document.getElementById(id);
  let tabId=null,record=null,epoch=0,settings={language:"en-US",rate:1,translationLanguage:"Urdu",translationFontSize:20},latest=null;
  const languages={Urdu:"ur-PK",English:"en-US",Arabic:"ar",French:"fr-FR",Spanish:"es-ES"};
  function render() {
    el("empty").hidden=!!record;el("workspace").hidden=!record;if(!record)return;
    el("selection").textContent=record.text;
    try{el("source").textContent=new URL(record.url).hostname||"Local PDF";}catch{el("source").textContent="PDF selection";}
    for(const [action,prefix] of [["translate","translation"],[(latest==="equation"||!latest&&record.results.equation)?"equation":"explain","explanation"]]){
      const result=record.results[action],section=el(prefix+"-section");section.hidden=!result;
      el(prefix+"-status").textContent=result?.error||result?.warning||(result?.type==="EXPLANATION_RESULT"?"":result?.stage||"Receiving…");
      el(prefix+"-answer").textContent=result?.text||"";
      if(result&&latest===action)section.open=true;
      else if(latest)section.open=false;
    }
    el("translate").disabled=!!record.results.translate&&record.results.translate.type!=="EXPLANATION_RESULT";
    const aiBusy=[record.results.explain,record.results.equation].some(result=>result&&result.type!=="EXPLANATION_RESULT");
    for(const id of ["ask","chatgpt","gemini","equation-explain"])el(id).disabled=aiBusy;
    el("translation-answer").style.fontSize=`${Math.min(32,Math.max(14,Number(settings.translationFontSize)||20))}px`;
    el("listen-translation").hidden=!record.results.translate?.text;
  }
  async function refresh() {
    const ticket=++epoch;
    try{
      const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
      const id=tab?.id;if(!Number.isInteger(id))return;
      const result=await chrome.runtime.sendMessage({type:"PDF_PANEL_GET",tabId:id});
      if(ticket!==epoch)return;
      if(!result?.ok)throw new Error(result?.error||"Could not load the PDF selection.");
      if(id!==tabId||record?.id!==result.record?.id){speechSynthesis.cancel();latest=null;el("equation-context").value="";el("notice").textContent="";el("providers").hidden=true;}
      tabId=id;record=result.record;render();
    }catch(error){if(ticket===epoch)el("notice").textContent=error.message;}
  }
  async function run(action,provider="chatgpt") {
    if(!record)return;
    const id=record.id;latest=action;el("providers").hidden=true;
    el("notice").textContent="";
    try{
      const reply=await chrome.runtime.sendMessage({type:"PDF_PANEL_RUN",tabId,selectionId:id,action,provider,language:settings.translationLanguage,context:el("equation-context").value,requestId:crypto.randomUUID()});
      if(!reply?.accepted)throw new Error(reply?.error||"The request could not start.");
      await refresh();
    }catch(error){el("notice").textContent=error.message;}
  }
  function speak(text,language) {
    if(!text)return;
    if(speechSynthesis.speaking){speechSynthesis.cancel();return;}
    const utterance=new SpeechSynthesisUtterance(text);utterance.lang=language;utterance.rate=Number(settings.rate)||1;
    const voice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith(language.split("-")[0].toLowerCase()));if(voice)utterance.voice=voice;
    utterance.onerror=()=>{el("notice").textContent="Speech is unavailable. Check the installed voices in your system settings.";};
    speechSynthesis.speak(utterance);
  }
  el("cross-context").addEventListener("click",async()=>{
    if(!record)return;
    const button=el("cross-context");button.disabled=true;
    try{
      const reply=await chrome.runtime.sendMessage({type:"PDF_PANEL_CONTEXT",tabId,selectionId:record.id});
      if(!reply?.ok)throw new Error(reply?.error||"Could not open contexts.");
    }catch(error){el("notice").textContent=error.message;}finally{button.disabled=false;}
  });
  el("listen").addEventListener("click",()=>speak(record?.text,settings.language));
  el("equation").addEventListener("click",()=>{
    const result=WordEquationSpeech.toSpeech(record?.text||"");el("notice").textContent=result.ok?result.text:result.error;if(result.ok)speak(result.text,"en-US");
  });
  el("equation-explain").addEventListener("click",()=>run("equation","chatgpt"));
  el("translate").addEventListener("click",()=>run("translate"));
  el("ask").addEventListener("click",()=>{el("providers").hidden=!el("providers").hidden;});
  el("chatgpt").addEventListener("click",()=>run("explain","chatgpt"));
  el("gemini").addEventListener("click",()=>run("explain","gemini"));
  el("listen-translation").addEventListener("click",()=>speak(record?.results.translate?.text,languages[settings.translationLanguage]||"ur-PK"));
  el("settings").addEventListener("click",()=>chrome.runtime.openOptionsPage().catch(()=>{el("notice").textContent="Could not open settings.";}));
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==="session"&&(changes[`pdf-selection:${tabId}`]||tabId===null&&Object.keys(changes).some(key=>key.startsWith("pdf-selection:"))))refresh();
    if(area==="local")chrome.storage.local.get(settings).then(value=>{settings=value;render();}).catch(()=>{});
  });
  chrome.tabs.onActivated.addListener(()=>refresh());
  window.addEventListener("unload",()=>speechSynthesis.cancel());
  chrome.storage.local.get(settings).then(value=>{settings=value;return refresh();}).catch(error=>{el("notice").textContent=error.message;});
})();
