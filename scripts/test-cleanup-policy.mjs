import fs from 'node:fs/promises';import vm from 'node:vm';import assert from 'node:assert/strict';
const background=await fs.readFile(new URL('../extension/background.js',import.meta.url),'utf8');
for(const provider of ['chatgpt','gemini'])for(const task of [undefined,'explain','paragraph-summary','context-summary','paper-explanation','whole-page-summary','future-task'])for(const failure of [false,true]){
 const state={activeExplanationJob:{tabId:77,sourceTabId:5,requestId:'request',provider,task,expectedPrompt:'owned prompt',contextId:'context',revision:1}},cleanup=[],closed=[],results=[],saved=[];
 const chrome={runtime:{id:'test',onMessage:{addListener(){}},sendMessage:async message=>results.push(message)},storage:{local:{},session:{get:async()=>structuredClone(state),set:async value=>Object.assign(state,value),remove:async key=>delete state[key]}},alarms:{clear:async()=>{},onAlarm:{addListener(){}}},commands:{onCommand:{addListener(){}}},tabs:{onRemoved:{addListener(){}},sendMessage:async(id,message)=>{if(message.type.endsWith('_CLEANUP')){cleanup.push(message);return{deleted:!failure,error:failure?'Unable to confirm deletion':undefined};}results.push(message);return{};},remove:async id=>closed.push(id)}};
 const ctx={chrome,setTimeout,clearTimeout,Date,URL,WordNotesStore:{create:()=>({})},WordReviewStore:{create:()=>({})},WordContextStore:{create:()=>({saveSummary:async()=>{},setCleanup:async(...args)=>saved.push(args)})},WordContextController:{create:()=>({})}};
 vm.runInNewContext(background,ctx);
 await ctx.finishJob(77,{ok:true,text:'Answer',cleanupPath:provider==='gemini'?'/app/owned':'/c/owned'});
 const ask=!task||task==='explain';assert.equal(cleanup.length,ask?1:0,provider+' '+task);assert.deepEqual(closed,ask&&!failure?[77]:[]);assert.equal(state.activeExplanationJob,undefined);assert.equal(results.at(-1).text,'Answer');
 if(ask&&failure)assert.match(results.at(-1).warning,/left open/);else assert.equal(results.at(-1).warning,undefined);
 if(task==='context-summary')assert.equal(saved[0][2].state,'retained');
}
console.log('PASS: only Ask to LLM invokes exact-owned-chat cleanup and closes tabs; paragraph/context/research/unknown tasks stay untouched for both providers; cleanup failures preserve answer and tab.');
