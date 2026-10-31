import fs from'node:fs/promises';import vm from'node:vm';import assert from'node:assert/strict';import{randomUUID}from'node:crypto';
for(const [file,name,prefix]of [['page-summary.js','WordPageSummary','PAGE_SUMMARY'],['page-references.js','WordPageReferences','PAGE_REFERENCES']]){
 const ctx={URL,TextEncoder,crypto:{randomUUID}},local={},session={},starts=[];vm.runInNewContext(await fs.readFile(new URL('../extension/'+file,import.meta.url),'utf8'),ctx);
 const chrome={runtime:{id:'test',getURL:n=>'chrome-extension://test/'+n,sendMessage:async()=>{}},storage:{local:{get:async()=>structuredClone(local),set:async v=>Object.assign(local,v)},session:{get:async()=>structuredClone(session),set:async v=>Object.assign(session,v)}},tabs:{query:async()=>{throw Error('Must use the sending page, not the active tab');}}};
 const service=ctx[name].create({chrome,start:async(...args)=>starts.push(args),readJob:async()=>null});
 const sender={id:'test',url:'https://source.test/article',frameId:0,tab:{id:11,url:'https://stale.test/old'}};
 const send=(message,s=sender)=>new Promise(resolve=>service.handle(message,s,resolve));
 assert.equal((await send({type:prefix+'_START',floating:true})).ok,true);assert.equal(starts[0][0],sender.url);assert.equal(starts[0][1],11);
 for(const bad of [{...sender,frameId:1},{...sender,id:'foreign'},{...sender,url:'file:///tmp/page'}])assert.equal((await send({type:prefix+'_GET',floating:true,url:sender.url},bad)).ok,false);
 assert.equal((await send({type:prefix+'_GET',floating:true,url:'https://another.test/private'})).ok,false);
 assert.equal((await send({type:prefix+'_GET'})).ok,false,'Source pages need the explicit floating-tools route');
}
console.log('PASS: floating page tools bind URL and tab to the authenticated top-frame sender, never the active tab; cross-page, subframe, foreign-extension and unsupported-source cache access refused.');
