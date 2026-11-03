import fs from 'node:fs/promises';import vm from 'node:vm';import assert from 'node:assert/strict';
const dir=new URL('../extension/',import.meta.url),read=name=>fs.readFile(new URL(name,dir),'utf8');
const helper={};vm.runInNewContext(await read('selection-references.js'),helper);
const source='Selected research concept '.repeat(200).trim(),prompt=helper.WordSelectionReferences.prompt(source);
assert.ok(prompt.includes(JSON.stringify({selection:source})));assert.ok(prompt.includes('maximum of 3'));
for(const bad of ['', '  ', 'x'.repeat(8001)])assert.throws(()=>helper.WordSelectionReferences.prompt(bad));
const flush=async()=>{for(let i=0;i<30;i++)await new Promise(setImmediate)};
const bg=(await Promise.all(['notes-store.js','review-store.js','context-store.js','context-controller.js','selection-references.js','background.js'].map(read))).join('\n');
for(const provider of ['chatgpt']){
 let handler;const store={},notifications=[],closed=[],targets=[],prefix=provider.toUpperCase();let start;
 const chrome={runtime:{id:'test',onMessage:{addListener:f=>handler=f}},commands:{onCommand:{addListener(){}}},storage:{session:{get:async()=>structuredClone(store),set:async v=>Object.assign(store,structuredClone(v)),remove:async k=>delete store[k]}},alarms:{create:async()=>{},clear:async()=>{},onAlarm:{addListener(){}}},tabs:{onRemoved:{addListener(){}},create:async()=>({id:77}),remove:async id=>closed.push(id),sendMessage:async(id,msg,options)=>{if(id===5){targets.push(options?.frameId);notifications.push(msg);return{received:true}}if(msg.type===prefix+'_START')start=msg;return msg.type===prefix+'_READY'?{ready:true,build:'0.4.35'}:msg.type===prefix+'_CLEANUP'?{deleted:true}:{accepted:true}}}};
 const boot=()=>vm.runInNewContext(bg,{chrome,Date,setTimeout,clearTimeout});boot();
 let ack;handler({type:'FIND_SELECTION_REFERENCES',action:'selection-references',text:source,requestId:'summary',build:'0.4.35',provider},{id:'test',tab:{id:5},frameId:17},v=>ack=v);
 assert.equal(ack.accepted,true);await flush();assert.equal(start.task,'selection-references');assert.equal(start.prompt,prompt);assert.equal(store.activeExplanationJob.expectedPrompt,prompt);assert.equal(store.activeExplanationJob.sourceFrameId,17);
 boot();handler({type:prefix+'_PARTIAL',text:'Partial summary'},{id:'test',tab:{id:88}},()=>{});await flush();assert.equal(notifications.length,0);
 handler({type:prefix+'_PARTIAL',text:'Partial summary'},{id:'test',tab:{id:77}},()=>{});await flush();assert.equal(notifications.at(-1).requestId,'summary');
 handler({type:prefix+'_RESULT',ok:true,text:'Final references',cleanupPath:provider==='gemini'?'/app/owned':'/c/owned'},{id:'test',tab:{id:77}},()=>{});await flush();assert.equal(notifications.at(-1).text,'Final references');assert.deepEqual(closed,[],"Reference chats stay open");assert.ok(targets.every(frame=>frame===17),"All progress and final answers return only to originating lesson frame");assert.equal(store.activeExplanationJob,undefined);
 handler({type:'FIND_SELECTION_REFERENCES',action:'selection-references',text:'x'.repeat(8001),requestId:'bad',build:'0.4.35',provider},{id:'test',tab:{id:5},frameId:17},v=>ack=v);assert.equal(ack.accepted,false);
}
console.log('PASS: selection prompt, full text, bounds, backend routing, restart recovery, owned answer delivery and preserved reference chats.');
