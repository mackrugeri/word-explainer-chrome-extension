// Bounded personal notes; only the background worker writes this store.
(() => {
  const KEY='wordPersonalNotesV1';
  const count=text=>String(text).trim().split(/\s+/u).filter(Boolean).length;
  const page=value=>{const u=new URL(value);if(!['https:','http:'].includes(u.protocol))throw Error('Notes require a webpage.');u.hash='';return u.href;};
  function create(storage){
    let queue=Promise.resolve();
    const run=fn=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;};
    const read=async()=>{const data=(await storage.get(KEY))[KEY];return Array.isArray(data)?data.slice(-400):[];};
    return {
      list:url=>run(async()=>(await read()).filter(n=>new URL(n.url).origin===new URL(url).origin)),
      save:(url,record)=>run(async()=>{
        const value=String(record?.body||'').trim(),anchor=record?.anchor;
        if(!value||value.length>12000||count(value)>100)throw Error('Write between 1 and 100 words.');
        if(!anchor||typeof anchor.exact!=='string'||!anchor.exact.trim()||anchor.exact.length>8000||!['prefix','suffix'].every(k=>typeof anchor[k]==='string'&&anchor[k].length<=80))throw Error('Select the passage again.');
        const records=await read(),canonical=page(url);
        const existing=records.find(n=>n.id===record.id&&n.url===canonical);
        const note={id:existing?.id||crypto.randomUUID(),url:canonical,body:value,anchor:{exact:anchor.exact,prefix:anchor.prefix,suffix:anchor.suffix},updatedAt:Date.now()};
        await storage.set({[KEY]:[...records.filter(n=>n.id!==note.id),note].slice(-400)});return note;
      }),
      remove:(url,id)=>run(async()=>{const canonical=page(url);await storage.set({[KEY]:(await read()).filter(n=>!(n.url===canonical&&n.id===id))});}),
      merge:async function(url,items){const notes=await this.list(url);const result=items.map(i=>({...i,notes:[...i.notes]}));for(const n of notes){let item=result.find(i=>i.text===n.anchor.exact);if(!item){item={text:n.anchor.exact,notes:[]};result.push(item);}item.notes.push({action:'personal',summary:n.body,sourceUrl:n.url,updatedAt:n.updatedAt,id:n.id});}return result;}
    };
  }
  globalThis.WordNotesStore={create,count,page,KEY};
})();
