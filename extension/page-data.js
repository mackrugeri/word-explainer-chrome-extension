// Current-page cleanup is explicit, extension-only and URL-scoped.
(() => {
 const SIGNAL='wordSelectionClearSignal';
 function canonical(value){const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Open a webpage to clear its data.');url.hash='';return url.href;}
 function create({chrome,notesStore,reviewStore,pageSummary,pageReferences,readingStore,cancel}){
  async function clear(url,tabId){
   await cancel?.(url,tabId);
   await notesStore.clearPage(url);await reviewStore.clearPage(url);
   await pageSummary?.clearPage(url);await pageReferences?.clearPage(url);await readingStore?.clearPage(url);
   await chrome.storage.local.remove('wordHighlightsV1:'+url);
   const selections=await chrome.storage.session.get(null),keys=Object.keys(selections).filter(key=>{if(!key.startsWith('pdf-selection:'))return false;try{return canonical(selections[key]?.url)===url;}catch{return false;}});
   if(keys.length)await chrome.storage.session.remove(keys);
   await chrome.storage.session.set({[SIGNAL]:{kind:'page',url,token:crypto.randomUUID()}});
  }
  function handle(message,sender,reply){
   if(message.type!=='CLEAR_PAGE_DATA')return false;
   let url;try{if(sender.id!==chrome.runtime.id||message.floating!==true||sender.frameId!==0||!Number.isInteger(sender.tab?.id))throw Error('Open page tools to clear this page.');url=canonical(sender.url);if(message.url&&canonical(message.url)!==url)throw Error('Only the current page can be cleared.');}catch(error){reply({ok:false,error:error.message});return true;}
   clear(url,sender.tab.id).then(()=>reply({ok:true,url}),error=>reply({ok:false,error:error.message||'Could not clear this page. Please retry.'}));return true;
  }
  return{handle};
 }
 globalThis.WordPageData={create,canonical,SIGNAL};
})();
