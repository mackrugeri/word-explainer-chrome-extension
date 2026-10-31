import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const code=await fs.readFile(new URL('../extension/page-references.js',import.meta.url),'utf8'),context={URL};
vm.runInNewContext(code,context);const parse=context.WordPageReferences.parse;
const source={title:'Primary study {with braces}',author:'A. Author',year:'2024',url:'https://research.test/study',relevance:'Explains the "mechanism" and \\ limitations.'};
const data={status:'researched',note:'Opened the page and checked the sources using search.',references:[source]},json=JSON.stringify(data);
for(const wrapper of [json,'```json\n'+json+'\n```','Here are the references:\n```json\n'+json+'\n```\nThese are ranked by relevance.','json\nCopy code\n'+json+'\nCopy\nGood response\nBad response','Here is the report:\nJSON\nCopy code\n'+JSON.stringify(data,null,2)+'\nRead aloud','An unrelated object: {"example":true}\n'+json]){
 const result=parse(wrapper);assert.equal(result.status,'researched');assert.equal(result.references.length,1);assert.equal(result.references[0].title,source.title);assert.equal(result.references[0].relevance,source.relevance);
}
const cut=json.slice(0,-3);assert.equal(parse(cut).references.length,0);assert.match(parse(cut).note,/cut off|incomplete/);
// Never recover complete nested objects within a broken outer report.
assert.equal(parse('{"status":"researched","note":"Cut off","references":['+json).references.length,0);
assert.equal(parse(json+'\n'+json).references.length,0);assert.match(parse(json+'\n'+json).note,/multiple/);
assert.equal(parse(json+'\n{"status":').references.length,0);
for(const answer of ["I can't access the source URL in this chat. Please paste the article.","I do not have live web access. I cannot verify these sources.",'Web search is unavailable. Try again later.', 'The page is behind a paywall. Please provide the text.']){
 const result=parse(answer);assert.equal(result.references.length,0);assert.match(result.note,/ChatGPT reports:/);assert.match(result.note,/chat stays open/);
}
assert.equal(parse("I cannot verify these references.\n"+json).references.length,0);
assert.equal(parse(JSON.stringify({...data,status:'limited',note:'I cannot access the source URL.'})).references.length,0);
assert.equal(parse('Here are some links: https://research.test/study https://other.test/').references.length,0);assert.match(parse('Some unrelated answer').note,/requested format/);
assert.equal(parse('{"status":"researched","note":"x","references":[}').references.length,0);
assert.equal(parse('{"status":"researched","references":[]}').references.length,0);
assert.equal(parse('x'.repeat(64001)).references.length,0);assert.match(parse('x'.repeat(64001)).note,/oversized/);
assert.equal(parse('{}\n'.repeat(33)+json).references.length,0);
const refs=[source,{...source,url:source.url+'#fragment'},{...source,url:'javascript:alert(1)'},{...source,url:'https://user:password@research.test/private'},...Array.from({length:15},(_,i)=>({...source,url:'https://research.test/'+i}))];
assert.equal(parse(JSON.stringify({...data,references:refs})).references.length,10);
assert.equal(parse(JSON.stringify({...data,status:'unavailable',note:'Source inaccessible',references:refs})).references.length,0);
// Raw cached answers are reparsed: existing wrapper failures need no repeated search.
assert.equal(parse('Copy code\n'+json).references[0].url,source.url);
console.log('PASS: real code-block UI/prose wrappers, escaped braces/quotes, bounded extraction, ambiguous/truncated/malformed rejection, honest no-access diagnostics, no prose-link inference, URL guards, deduplication and ten-source cap.');
