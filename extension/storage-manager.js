// Local-storage inventory and narrowly scoped deletion. No page code can invoke
// the settings-only route; shared contexts keep their existing deletion flow.
(() => {
  const KEYS={review:'wordReviewPagesV1',notes:'wordPersonalNotesV1',contexts:'wordContextsV1'};
  const PREFIX='wordHighlightsV1:';
  const preferences=['language','rate','detail','translationLanguage','translationFontSize'];
  const bytes=value=>new TextEncoder().encode(JSON.stringify(value)??'').length;
  function origin(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.origin:null;}catch{return null;}}
  function inventory(data){
    const sites=new Map(),known=new Set([...Object.values(KEYS),...preferences]);
    const site=url=>{const id=origin(url);if(!id)return null;if(!sites.has(id))sites.set(id,{origin:id,review:{count:0,bytes:0,examples:[]},notes:{count:0,bytes:0,examples:[]},highlights:{count:0,bytes:0,examples:[]},contextQuotes:0});return sites.get(id);};
    const add=(url,category,value,count,example)=>{const entry=site(url)?.[category];if(!entry)return;entry.count+=count;entry.bytes+=bytes(value);if(entry.examples.length<3&&example)entry.examples.push(String(example).slice(0,220));};
    for(const record of Array.isArray(data[KEYS.review])?data[KEYS.review]:[]){
      if(!record||!Array.isArray(record.items))continue;
      add(record.url,'review',record,record.items.reduce((n,item)=>n+(Array.isArray(item?.notes)?item.notes.length:0),0),record.items[0]?.text);
    }
    for(const record of Array.isArray(data[KEYS.notes])?data[KEYS.notes]:[]){
      if(record)add(record.url,'notes',record,1,`${record.anchor?.exact||'Passage'} — ${record.body||''}`);
    }
    for(const [key,value]of Object.entries(data))if(key.startsWith(PREFIX)){
      known.add(key);if(!Array.isArray(value?.items))continue;
      add(key.slice(PREFIX.length),'highlights',value,value.items.length,value.items[0]?.anchor?.exact);
    }
    const contexts=[];
    for(const record of Array.isArray(data[KEYS.contexts])?data[KEYS.contexts]:[]){
      if(!record)continue;const quotes=Array.isArray(record.quotes)?record.quotes:[];
      contexts.push({name:String(record.name||'Unnamed context').slice(0,100),quotes:quotes.length,bytes:bytes(record)});
      for(const quote of quotes){const entry=site(quote?.url);if(entry)entry.contextQuotes++;}
    }
    const others=Object.keys(data).filter(key=>!known.has(key)).map(key=>({key,bytes:bytes(data[key])}));
    return {sites:[...sites.values()].sort((a,b)=>a.origin.localeCompare(b.origin)),contexts,
      preferences:{count:preferences.filter(key=>Object.hasOwn(data,key)).length,bytes:preferences.reduce((n,key)=>n+(Object.hasOwn(data,key)?bytes(data[key]):0),0)},
      others,estimatedBytes:Object.entries(data).reduce((n,[key,value])=>n+bytes(value)+new TextEncoder().encode(key).length,0)};
  }
  function create({storage,reviewStore,notesStore}){
    return {
      async inspect(){const data=await storage.get(null);const report=inventory(data);report.totalBytes=storage.getBytesInUse?await storage.getBytesInUse(null):report.estimatedBytes;report.quotaBytes=storage.QUOTA_BYTES||10485760;return report;},
      async clear(site,category){
        if(origin(site)!==site)throw Error('Choose a website from the storage list.');
        if(!['review','notes','highlights','all'].includes(category))throw Error('This data is managed elsewhere and cannot be removed here.');
        if(category==='review'||category==='all')await reviewStore.clear(site);
        if(category==='notes'||category==='all')await notesStore.clearSite(site);
        if(category==='highlights'||category==='all'){
          const keys=storage.getKeys?await storage.getKeys():Object.keys(await storage.get(null));
          const selected=keys.filter(key=>key.startsWith(PREFIX)&&origin(key.slice(PREFIX.length))===site);
          if(selected.length)await storage.remove(selected);
        }
      }
    };
  }
  globalThis.WordStorageManager={inventory,create,origin};
})();
