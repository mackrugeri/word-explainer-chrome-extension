// Bounded website selection history. Navigation never makes an external request.
(() => {
 function create({page,limit=20,maxBytes=2000000,onChange=()=>{}}){
  let entries=[],index=-1,source=page(),serial=0;
  function ensure(){if(page()!==source){entries=[];index=-1;source=page();changed();}}
  function changed(){onChange(exportState());}
  function exportState(){return{page:source,index,entries:entries.map(({range,results,...item})=>({...item,results:[...results.values()]}))};}
  function trim(){while(entries.length>1&&(entries.length>limit||entries.reduce((sum,item)=>sum+item.bytes,0)>maxBytes)){const remove=index===0?1:0;entries.splice(remove,1);if(index>remove)index--;}}
  function remember(snapshot){
   ensure();const signature=JSON.stringify([snapshot.text,snapshot.sourceUrl,snapshot.anchor||null]);let entry=entries[index];
   if(entry?.signature===signature){entry.range=snapshot.range;return entry;}
   entries=entries.slice(0,index+1);
   entry={...snapshot,id:++serial,signature,results:new Map(),bytes:(snapshot.text.length+snapshot.paperSelection.length+signature.length)*2};
   entries.push(entry);index=entries.length-1;trim();changed();return entry;
  }
  function update(id,result){ensure();const entry=entries.find(item=>item.id===id);if(!entry)return;const key=result.action==='paper-explanation'?'explain':result.action;entry.results.delete(key);entry.results.set(key,result);entry.bytes=(entry.text.length+entry.paperSelection.length+entry.signature.length+JSON.stringify([...entry.results.values()]).length)*2;trim();changed();}
  return{remember,update,exportState,removePage(url){ensure();const current=entries[index];entries=entries.filter(item=>item.sourceUrl.split('#')[0]!==url.split('#')[0]);index=entries.indexOf(current);if(index<0)index=entries.length-1;changed();},restore(state){
   if(entries.length||state?.page!==page()||!Array.isArray(state.entries))return false;
   for(const item of state.entries.slice(-limit)){
    if(typeof item.text!=='string'||!item.text||typeof item.paperSelection!=='string'||typeof item.sourceUrl!=='string')continue;
    const results=new Map();for(const result of (Array.isArray(item.results)?item.results:[]))if(result&&typeof result.action==='string')results.set(result.action==='paper-explanation'?'explain':result.action,result);
    const signature=JSON.stringify([item.text,item.sourceUrl,item.anchor||null]);
    entries.push({...item,id:++serial,range:null,signature,results,bytes:JSON.stringify(item).length*2});
   }
   index=Math.max(0,Math.min(entries.length-1,Number.isInteger(state.index)?state.index:entries.length-1));trim();return !!entries.length;
  },clear(){entries=[];index=-1;source=page();changed();},current(){ensure();return entries[index]||null;},position(){ensure();return{index,count:entries.length};},move(delta){ensure();const next=index+delta;if(next<0||next>=entries.length)return null;index=next;changed();return entries[index];}};
 }
 globalThis.WordSelectionHistory={create};
})();
