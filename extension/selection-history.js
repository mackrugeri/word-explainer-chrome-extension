// Bounded in-page selection history. Navigation never makes an external request.
(() => {
 function create({page,limit=20,maxBytes=2000000}){
  let entries=[],index=-1,source=page(),serial=0;
  function ensure(){if(page()!==source){entries=[];index=-1;source=page();}}
  function trim(){while(entries.length>1&&(entries.length>limit||entries.reduce((sum,item)=>sum+item.bytes,0)>maxBytes)){const remove=index===0?1:0;entries.splice(remove,1);if(index>remove)index--;}}
  function remember(snapshot){
   ensure();const signature=JSON.stringify([snapshot.text,snapshot.sourceUrl,snapshot.anchor||null]);let entry=entries[index];
   if(entry?.signature===signature){entry.range=snapshot.range;return entry;}
   entries=entries.slice(0,index+1);
   entry={...snapshot,id:++serial,signature,results:new Map(),bytes:(snapshot.text.length+snapshot.paperSelection.length+signature.length)*2};
   entries.push(entry);index=entries.length-1;trim();return entry;
  }
  function update(id,result){ensure();const entry=entries.find(item=>item.id===id);if(!entry)return;const key=result.action==='paper-explanation'?'explain':result.action;entry.results.delete(key);entry.results.set(key,result);entry.bytes=(entry.text.length+entry.paperSelection.length+entry.signature.length+JSON.stringify([...entry.results.values()]).length)*2;trim();}
  return{remember,update,clear(){entries=[];index=-1;source=page();},current(){ensure();return entries[index]||null;},position(){ensure();return{index,count:entries.length};},move(delta){ensure();const next=index+delta;if(next<0||next>=entries.length)return null;index=next;return entries[index];}};
 }
 globalThis.WordSelectionHistory={create};
})();
