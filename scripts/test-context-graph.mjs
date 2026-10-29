import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const extension=new URL('../extension/',import.meta.url);
const storeScope={URL};vm.runInNewContext(await fs.readFile(new URL('context-store.js',extension),'utf8'),storeScope);
const saved={};let seq=0;const storage={get:async()=>structuredClone(saved),set:async value=>Object.assign(saved,structuredClone(value))};
let store=storeScope.WordContextStore.create(storage,()=>`g-${++seq}`);
const initial=await store.create('Initial capture',{text:'First paragraph',url:'https://example.com/first',title:'First source'});
assert.equal(initial.quotes.length,1);assert.equal(initial.quotes[0].text,'First paragraph');assert.equal(initial.revision,1);
await assert.rejects(store.create('Invalid capture',{text:'',url:'https://example.com'}));
assert.equal((await store.list()).some(c=>c.name==='Invalid capture'),false,'Invalid first capture must not leave an empty context');
let context=await store.create('Graph research');
for(let i=0;i<10;i++)await store.add(context.id,{text:`Concept ${i+1}`,title:`Source ${i+1}`,url:`https://example.com/${i}`});
context=(await store.list()).find(item=>item.name==='Graph research');const first=context.quotes[0].id,last=context.quotes[9].id;
const beforeRevision=context.revision;await store.move(context.id,first,{x:300,y:400});context=(await store.list()).find(item=>item.name==='Graph research');
assert.equal(context.revision,beforeRevision,'Moving cards must not invalidate the summary');assert.deepEqual(context.layout[first],{x:300,y:400});
await assert.rejects(store.move(context.id,'missing',{x:0,y:0}));await assert.rejects(store.move(context.id,first,{x:Infinity,y:5}));
await store.link(context.id,first,last,'Supports');context=(await store.list()).find(item=>item.name==='Graph research');assert.equal(context.links.length,1);assert.equal(context.revision,beforeRevision+1);
store=storeScope.WordContextStore.create(storage,()=>`g-${++seq}`);assert.deepEqual((await store.list()).find(item=>item.name==='Graph research').layout[first],{x:300,y:400});
await store.remove(context.id,first);context=(await store.list()).find(item=>item.name==='Graph research');assert.equal(context.layout[first],undefined);assert.equal(context.links.length,0);

class Node{
  constructor(tag){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.attrs={};this.handlers={};this.parentElement=null;this.className='';this.disabled=false;
    this.classList={add:name=>{this.className+=' '+name},remove:name=>{this.className=this.className.split(' ').filter(n=>n!==name).join('')}};
  }
  appendChild(child){child.parentElement=this;this.children.push(child);return child}
  replaceChildren(){this.children=[]}
  setAttribute(name,value){this.attrs[name]=String(value)}
  addEventListener(type,handler){this.handlers[type]=handler}
  remove(){this.parentElement.children=this.parentElement.children.filter(n=>n!==this)}
  getBoundingClientRect(){return{left:0,top:0,width:1500,height:1600}}
  setPointerCapture(){}
  closest(selector){let node=this;while(node){if(selector==='.graph-node'&&node.className==='graph-node')return node;node=node.parentElement}return null}
  contains(node){for(let n=node;n;n=n.parentElement)if(n===this)return true;return false}
}
let hit=null;const document={createElement:tag=>new Node(tag),createElementNS:(_,tag)=>new Node(tag),elementFromPoint:()=>hit};
const scope={document};vm.runInNewContext(await fs.readFile(new URL('context-graph.js',extension),'utf8'),scope);
const root=new Node('div'),moves=[],links=[],unlinks=[],messages=[];
const graph=scope.WordContextGraph.create(root,{status:message=>messages.push(message),onMove:(...args)=>moves.push(args),onLink:(...args)=>links.push(args),onUnlink:(...args)=>unlinks.push(args)});
const single={id:'single',quotes:[{id:'first',title:'First source',text:'First paragraph'}],links:[],layout:{}};graph.render(single);assert.equal(root.children[1].children[0].children.filter(n=>n.className==='graph-node').length,1);
const data={id:'context',quotes:Array.from({length:10},(_,index)=>({id:`q${index}`,title:`Source ${index+1}`,text:`Concept ${index+1}`})),links:[],layout:{}};
graph.render(data);const viewport=root.children[1],board=viewport.children[0],svg=board.children[0];
let cards=board.children.filter(n=>n.className==='graph-node');assert.equal(cards.length,10);
const header=cards[0].children[0];header.handlers.pointerdown({button:0,pointerId:1,clientX:60,clientY:55,preventDefault(){}});header.handlers.pointermove({pointerId:1,clientX:160,clientY:155});header.handlers.pointerup({pointerId:1});
assert.equal(cards[0].style.left,'160px');assert.equal(cards[0].style.top,'155px');assert.equal(moves[0][1],'q0');assert.equal(moves[0][2].x,160);
const output=cards[0].children[3];hit=cards[9];
output.handlers.pointerdown({button:0,pointerId:2,clientX:390,clientY:210,preventDefault(){}});
output.handlers.pointermove({pointerId:2,clientX:390,clientY:480});
assert.ok(svg.children.some(n=>n.attrs.class==='graph-edge preview'));
output.handlers.pointerup({pointerId:2,clientX:390,clientY:480});assert.deepEqual(links[0],['context','q0','q9'],'Dragging from first to tenth creates the requested edge');
output.handlers.click({detail:1});assert.equal(links.length,1,'The post-drag click must not create another connection');
output.handlers.click({detail:0});cards[8].children[2].handlers.click();assert.deepEqual(links[1],['context','q0','q8'],'Keyboard/click selection also creates a connection');
data.links=[{id:'edge-1',from:'q0',to:'q9',note:'Supports'}];graph.render(data);
const edge=svg.children.find(n=>n.attrs.class==='graph-edge');assert.ok(edge.attrs['marker-end']);edge.handlers.click();root.children[0].children[1].handlers.click();assert.deepEqual(unlinks[0],['context','edge-1']);
const beforeLinks=links.length;cards=board.children.filter(n=>n.className==='graph-node');cards[0].children[3].handlers.click({detail:0});cards[0].children[2].handlers.click();assert.equal(links.length,beforeLinks,'Self connections are refused');
console.log('PASS: graph position persistence, non-semantic layout moves, invalid coordinate rejection, deleted-node cleanup, ten-card rendering, drag-to-connect first to tenth, duplicate-click suppression, keyboard linking, arrow selection/removal, and self-link refusal.');

const deleteTarget=await store.create('Exact name',{text:'Delete only me',url:'https://example.com/delete'});
await assert.rejects(store.delete(deleteTarget.id,'exact name'),/does not match/);
await assert.rejects(store.delete(deleteTarget.id,'Exact name '),/does not match/);
assert.ok((await store.list()).some(item=>item.id===deleteTarget.id));
await store.delete(deleteTarget.id,'Exact name');assert.equal((await store.list()).some(item=>item.id===deleteTarget.id),false);
assert.ok((await store.list()).some(item=>item.name==='Graph research'),'Deleting one context must preserve other contexts');
console.log('PASS: context deletion requires exact typed name, rejects case/whitespace mismatches, and preserves other contexts.');
