// Extension-private, bounded history for a tab/frame across reloads.
(() => {
 const PREFIX='selection-history:';
 function canonical(value){return new URL(value).href.split('#')[0];}
 function site(value){return new URL(value).origin;}
 function create(chrome){
  let queue=Promise.resolve();
  const run=task=>{const result=queue.then(task);queue=result.catch(()=>{});return result;};
  const sweep=predicate=>run(async()=>{const all=await chrome.storage.session.get(null);const keys=Object.keys(all).filter(key=>key.startsWith(PREFIX)&&predicate(all[key],key));if(keys.length)await chrome.storage.session.remove(keys);});
  chrome.tabs.onRemoved.addListener(id=>{sweep((value,key)=>key.startsWith(PREFIX+id+':')).catch(()=>{});});
  chrome.tabs.onUpdated?.addListener((id,change)=>{if(change.url)sweep((value,key)=>key.startsWith(PREFIX+id+':')&&value.topUrl!==site(change.url)).catch(()=>{});});
  chrome.storage.onChanged?.addListener((changes,area)=>{
   const signal=changes.wordSelectionClearSignal?.newValue;if(area!=='session'||!signal)return;
   run(async()=>{const all=await chrome.storage.session.get(null);for(const [key,value]of Object.entries(all)){
    if(!key.startsWith(PREFIX))continue;
    if(signal.site&&value.url===signal.site){await chrome.storage.session.remove(key);continue;}
    if(signal.url&&value.url===site(signal.url)){
     value.state.entries=value.state.entries.filter(item=>canonical(item.sourceUrl)!==canonical(signal.url));
     value.state.index=Math.min(value.state.index,value.state.entries.length-1);
     if(value.state.entries.length)await chrome.storage.session.set({[key]:value});else await chrome.storage.session.remove(key);
    }
   }}).catch(()=>{});
  });
  function handle(message,sender,reply){
   if(!['LOAD_SELECTION_HISTORY','SAVE_SELECTION_HISTORY'].includes(message.type))return false;
   if(sender.id!==chrome.runtime.id||!Number.isInteger(sender.tab?.id)||!sender.url){reply({ok:false});return true;}
   const url=site(sender.url),topUrl=site(sender.tab.url||sender.url),key=PREFIX+sender.tab.id+':'+(sender.frameId||0);
   run(async()=>{
    if(message.type==='LOAD_SELECTION_HISTORY'){
     const value=(await chrome.storage.session.get(key))[key];
     if(value&&(value.url!==url||value.topUrl!==topUrl)){await chrome.storage.session.remove(key);return{ok:true};}
     return{ok:true,state:value?.state};
    }
    const state=message.state;
    if(state?.page!==url||!Array.isArray(state.entries)||state.entries.length>20||JSON.stringify(state).length*2>2100000)throw Error('Invalid history snapshot');
    if(!state.entries.length){await chrome.storage.session.remove(key);return{ok:true};}
    // Keep aggregate history below session storage quota, evicting oldest other tabs.
    const value={url,topUrl,state,updated:Date.now()},all=await chrome.storage.session.get(null);
    const records=Object.entries(all).filter(([name])=>name.startsWith(PREFIX)&&name!==key).sort((a,b)=>a[1].updated-b[1].updated);
    let bytes=JSON.stringify(value).length*2+records.reduce((sum,[,item])=>sum+JSON.stringify(item).length*2,0);
    const remove=[];for(const [name,item]of records){if(bytes<=4000000)break;remove.push(name);bytes-=JSON.stringify(item).length*2;}
    if(remove.length)await chrome.storage.session.remove(remove);
    await chrome.storage.session.set({[key]:value});return{ok:true};
   }).then(reply,error=>reply({ok:false,error:error.message}));return true;
  }
  return{handle};
 }
 globalThis.WordSelectionHistorySession={create};
})();
