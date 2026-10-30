// Native PDF selections arrive through Chrome's menu, never by scripting its viewer.
(() => {
  const MENU = "word-pdf-selection";
  const key = tabId => `pdf-selection:${tabId}`;
  function create({chrome,translate,start,feedback,capture}) {
    const queues = new Map();
    const update = (tabId,fn) => {
      const next=(queues.get(tabId)||Promise.resolve()).catch(()=>{}).then(async()=>{
        const record=(await chrome.storage.session.get(key(tabId)))[key(tabId)];
        const changed=await fn(record);
        if(changed)await chrome.storage.session.set({[key(tabId)]:changed});
        return changed;
      });
      queues.set(tabId,next);next.finally(()=>{if(queues.get(tabId)===next)queues.delete(tabId);}).catch(()=>{});
      return next;
    };
    const trusted = sender => {
      try{return sender.id===chrome.runtime.id&&!sender.tab&&new URL(sender.url).href===chrome.runtime.getURL("pdf-panel.html");}catch{return false;}
    };
    async function notify(tabId,message) {
      return !!await update(tabId,record=>{
        if(!record)return;
        const action=Object.keys(record.requests).find(name=>record.requests[name]===message.requestId);
        if(!action)return;
        record.results[action]={...record.results[action],...message};return record;
      });
    }
    function install() {
      // One selection fallback also covers extensionless PDF URLs and embedded PDFs.
      chrome.contextMenus.remove(MENU,()=>{
        void chrome.runtime.lastError;
        chrome.contextMenus.create({id:MENU,title:"Word Explainer — PDF actions",contexts:["selection"]},()=>{void chrome.runtime.lastError;});
      });
    }
    chrome.runtime.onInstalled.addListener(install);
    chrome.runtime.onStartup?.addListener(install);
    chrome.contextMenus.onClicked.addListener((info,tab)=>{
      if(info.menuItemId!==MENU||!Number.isInteger(tab?.id))return;
      const text=typeof info.selectionText==="string"?info.selectionText.trim():"";
      if(!text||text.length>8000){feedback(tab.id,"Select between 1 and 8,000 characters for PDF actions.");return;}
      // Call open synchronously while Chrome still grants the menu's user gesture.
      const opening=chrome.sidePanel.open({tabId:tab.id});
      update(tab.id,()=>({id:crypto.randomUUID(),tabId:tab.id,text,exactText:info.selectionText,url:[info.frameUrl,info.pageUrl,tab.url].find(value=>{try{return ["http:","https:","file:"].includes(new URL(value).protocol);}catch{return false;}})||"",title:String(tab.title||"PDF source").slice(0,300),requests:{},results:{}}))
        .catch(()=>feedback(tab.id,"Could not save the selected PDF text. Retry the menu."));
      opening.catch(()=>feedback(tab.id,"Could not open PDF actions. Reload the extension and retry the menu."));
    });
    chrome.tabs.onRemoved.addListener(tabId=>{
      update(tabId,async()=>{await chrome.storage.session.remove(key(tabId));}).catch(()=>{});
    });
    chrome.tabs.onUpdated?.addListener((tabId,change)=>{
      if(change.url)update(tabId,async()=>{await chrome.storage.session.remove(key(tabId));}).catch(()=>{});
    });
    function handle(message,sender,respond) {
      if(!message.type?.startsWith("PDF_PANEL_"))return false;
      if(!trusted(sender)||!Number.isInteger(message.tabId)||message.tabId<0){respond({ok:false,error:"Open PDF actions from the selection menu."});return true;}
      (async()=>{
        await chrome.tabs.get(message.tabId);
        if(message.type==="PDF_PANEL_GET"){
          const record=(await chrome.storage.session.get(key(message.tabId)))[key(message.tabId)];
          respond({ok:true,record:record||null});return;
        }
        if(message.type==="PDF_PANEL_CONTEXT"){
          const record=await update(message.tabId,current=>{
            if(!current||current.id!==message.selectionId)throw new Error("The selection changed. Select the PDF text again.");
            return current;
          });
          if(!record.url)throw new Error("The PDF source URL is unavailable. Open the PDF directly and select its text again.");
          respond(await capture(record));return;
        }
        if(message.type!=="PDF_PANEL_RUN")throw new Error("Unsupported PDF action.");
        if(!["translate","explain","paper-explanation"].includes(message.action)||!/^[a-zA-Z0-9-]{8,100}$/.test(message.requestId||""))throw new Error("Choose a PDF action again.");
        if(!["chatgpt","gemini"].includes(message.provider))throw new Error("Choose ChatGPT or Gemini.");
        if(!["Urdu","English","Arabic","French","Spanish"].includes(message.language))throw new Error("Choose a supported language in settings.");
        const record=await update(message.tabId,current=>{
          if(!current||current.id!==message.selectionId)throw new Error("The selection changed. Select the PDF text again.");
          if(message.action==="paper-explanation"){WordPaperExplanation.prompt(current.exactText??current.text,current.url);message.provider="chatgpt";}
          if(message.action!=="paper-explanation"&&current.text.length>1000)throw new Error("Select up to 1,000 characters for translation or AI explanation.");
          current.requests[message.action]=message.requestId;
          current.results[message.action]={type:"EXPLANATION_PROGRESS",requestId:message.requestId,stage:message.action==="translate"?"Translating…":"Asking "+(message.provider==="gemini"?"Gemini":"ChatGPT")+"…"};return current;
        });
        respond({ok:true,accepted:true});
        const work=message.action==="translate"
          ? translate(record.text,message.language,message.requestId,message.tabId).then(text=>notify(message.tabId,{type:"EXPLANATION_RESULT",requestId:message.requestId,ok:true,text}))
          : start(message.action==="paper-explanation"?(record.exactText??record.text):record.text,message.tabId,message.requestId,message.provider,{surface:"pdf-panel",...(message.action==="paper-explanation"?{task:"paper-explanation",sourceUrl:record.url}:{})});
        work.catch(error=>notify(message.tabId,{type:"EXPLANATION_RESULT",requestId:message.requestId,ok:false,error:error.message})).catch(()=>{});
      })().catch(error=>respond({ok:false,error:error.message||"PDF actions are unavailable. Retry."}));
      return true;
    }
    return {handle,notify};
  }
  globalThis.WordPDFSelection={create};
})();
