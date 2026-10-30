import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const code=await fs.readFile(new URL('../extension/review-store.js',import.meta.url),'utf8');
const ctx={URL};vm.runInNewContext(code,ctx);
const note=(summary,updatedAt)=>({action:'explain',provider:'chatgpt',language:'',summary,updatedAt});
const data={wordReviewPagesV1:[
 {url:'https://docs.example.com/step1',items:[{text:'alpha',notes:[note('Old explanation.',1)],updatedAt:1}]},
 {url:'https://docs.example.com/step2?q=1',items:[{text:'beta',notes:[note('Second concept.',2)],updatedAt:2},{text:'alpha',notes:[note('Updated explanation.',3)],updatedAt:3}]},
 {url:'https://other.example.com/step1',items:[{text:'separate',notes:[note('Other site.',4)]}]}
]};
const storage={get:async()=>structuredClone(data),set:async obj=>Object.assign(data,structuredClone(obj))};
let store=ctx.WordReviewStore.create(storage);
let items=await store.list('https://docs.example.com/next#section');assert.equal(items.length,2);assert.equal(items.find(i=>i.text==='alpha').notes[0].summary,'Updated explanation.');
assert.equal(items.find(i=>i.text==='beta').notes[0].sourceUrl,'https://docs.example.com/step2?q=1');
await store.save('https://docs.example.com/next',{text:'gamma',action:'translate',answer:'Third concept.'});
assert.equal(data.wordReviewPagesV1.filter(p=>p.url==='https://docs.example.com').length,1);
store=ctx.WordReviewStore.create(storage);assert.equal((await store.list('https://docs.example.com/step3')).length,3,'Reload retains the full same-site recap');
await store.clear('https://docs.example.com/anywhere');assert.equal((await store.list('https://docs.example.com/step1')).length,0);assert.equal((await store.list('https://other.example.com/step1')).length,1);
console.log('PASS: same-site Next/query/fragment navigation and reload retention, legacy page-history merge, newest-note deduplication, source preservation, and subdomain/site clearing isolation.');
