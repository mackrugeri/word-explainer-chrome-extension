// Dependency-free research graph. Data mutations remain in the context service.
(() => {
  const WIDTH=1500,HEIGHT=1600,CARD_W=230,CARD_H=126;
  const clamp=(value,max)=>Math.max(20,Math.min(Number(value)||20,max));
  const point=position=>({x:clamp(position.x,WIDTH-CARD_W-20),y:clamp(position.y,HEIGHT-CARD_H-20)});
  const defaultPosition=index=>({x:60+(index%4)*330,y:55+Math.floor(index/4)*185});
  function create(container,callbacks){
    const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
    const svgEl=tag=>document.createElementNS('http://www.w3.org/2000/svg',tag);
    const toolbar=el('div',undefined,'graph-toolbar');
    const hint=el('p','Drag cards by their header. Drag an OUT dot onto an IN dot to connect. You can also click OUT, then IN.','hint');
    const remove=el('button','Remove selected arrow','secondary small');remove.type='button';remove.disabled=true;
    toolbar.appendChild(hint);toolbar.appendChild(remove);
    const viewport=el('div',undefined,'graph-viewport');viewport.tabIndex=0;viewport.setAttribute('aria-label','Scrollable context connection map');
    const board=el('div',undefined,'graph-board');board.style.width=WIDTH+'px';board.style.height=HEIGHT+'px';viewport.appendChild(board);
    const svg=svgEl('svg');svg.setAttribute('width',WIDTH);svg.setAttribute('height',HEIGHT);svg.classList.add('graph-edges');svg.setAttribute('aria-label','Connections between excerpts');
    board.appendChild(svg);container.appendChild(toolbar);container.appendChild(viewport);
    let context=null,positions=new Map(),nodes=new Map(),drag=null,connecting=null,selected=null,suppressClick=false;
    function coordinates(event){const rect=board.getBoundingClientRect();return{x:event.clientX-rect.left,y:event.clientY-rect.top};}
    function drawEdges(){
      svg.replaceChildren();
      const defs=svgEl('defs'),marker=svgEl('marker');marker.id='context-arrow-head';marker.setAttribute('viewBox','0 0 10 10');marker.setAttribute('refX','9');marker.setAttribute('refY','5');marker.setAttribute('markerWidth','7');marker.setAttribute('markerHeight','7');marker.setAttribute('orient','auto-start-reverse');
      const triangle=svgEl('path');triangle.setAttribute('d','M 0 0 L 10 5 L 0 10 z');triangle.setAttribute('fill','currentColor');marker.appendChild(triangle);defs.appendChild(marker);svg.appendChild(defs);
      function edge(from,to,link){
        const x1=from.x+CARD_W+18,y1=from.y+CARD_H/2,x2=to.x-18,y2=to.y+CARD_H/2;
        const curve=Math.max(70,Math.abs(x2-x1)/2);const path=svgEl('path');
        path.setAttribute('d',`M ${x1} ${y1} C ${x1+curve} ${y1}, ${x2-curve} ${y2}, ${x2} ${y2}`);
        path.setAttribute('fill','none');path.setAttribute('marker-end','url(#context-arrow-head)');path.setAttribute('stroke-width',link?.id===selected?'4':'2.5');
        path.setAttribute('class',link?'graph-edge':'graph-edge preview');
        if(link){
          path.setAttribute('tabindex','0');path.setAttribute('role','button');path.setAttribute('aria-label',`Select arrow ${number(link.from)} to ${number(link.to)}${link.note?': '+link.note:''}`);
          const title=svgEl('title');title.textContent=link.note||`Excerpt ${number(link.from)} → ${number(link.to)}`;path.appendChild(title);
          const select=()=>{selected=link.id;remove.disabled=false;drawEdges();};
          path.addEventListener('click',select);path.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});
        }
        svg.appendChild(path);
      }
      for(const link of context?.links||[]){const from=positions.get(link.from),to=positions.get(link.to);if(from&&to)edge(from,to,link);}
      if(connecting){const from=positions.get(connecting.from);if(from&&connecting.pointer)edge(from,{x:connecting.pointer.x,y:connecting.pointer.y-CARD_H/2},null);}
    }
    const number=id=>context?.quotes.findIndex(quote=>quote.id===id)+1;
    function cancel(){drag=null;connecting=null;board.classList.remove('is-connecting');drawEdges();}
    async function connect(to){
      if(!connecting||!context)return;
      const {from,contextId}=connecting;cancel();
      if(from===to){callbacks.status('Choose a different excerpt.');return;}
      if(context.links.some(link=>link.from===from&&link.to===to)){callbacks.status('Those excerpts already have an arrow.');return;}
      await callbacks.onLink(contextId,from,to);
    }
    function render(next){
      context=next;cancel();selected=null;remove.disabled=true;positions=new Map();nodes.forEach(node=>node.remove());nodes.clear();
      next.quotes.forEach((quote,index)=>{
        const saved=next.layout?.[quote.id];const position=point(saved||defaultPosition(index));positions.set(quote.id,position);
        const card=el('article',undefined,'graph-node');card.dataset.quoteId=quote.id;card.style.left=position.x+'px';card.style.top=position.y+'px';
        const header=el('button',`[${index+1}] ${quote.title}`,'graph-drag-handle');header.type='button';header.setAttribute('aria-label',`Move excerpt ${index+1}. Drag or use arrow keys.`);
        const text=el('p',quote.text.slice(0,180));text.dir='auto';text.title=quote.text;
        const input=el('button','IN','graph-port input'),output=el('button','OUT','graph-port output');input.type=output.type='button';input.setAttribute('aria-label',`Connect to excerpt ${index+1}`);output.setAttribute('aria-label',`Connect from excerpt ${index+1}`);
        card.appendChild(header);card.appendChild(text);card.appendChild(input);card.appendChild(output);board.appendChild(card);nodes.set(quote.id,card);
        header.addEventListener('pointerdown',event=>{
          if(event.button!==0)return;cancel();const start=coordinates(event);drag={id:event.pointerId,quoteId:quote.id,contextId:next.id,start,original:{...positions.get(quote.id)},moved:false};header.setPointerCapture(event.pointerId);event.preventDefault();
        });
        header.addEventListener('pointermove',event=>{
          if(!drag||event.pointerId!==drag.id)return;const at=coordinates(event);if(Math.hypot(at.x-drag.start.x,at.y-drag.start.y)<4&&!drag.moved)return;
          drag.moved=true;const value=point({x:drag.original.x+at.x-drag.start.x,y:drag.original.y+at.y-drag.start.y});positions.set(drag.quoteId,value);card.style.left=value.x+'px';card.style.top=value.y+'px';drawEdges();
        });
        header.addEventListener('pointerup',event=>{if(!drag||drag.id!==event.pointerId)return;const finished=drag;drag=null;if(finished.moved)callbacks.onMove(finished.contextId,finished.quoteId,positions.get(finished.quoteId));});
        header.addEventListener('pointercancel',()=>{if(drag){const original=drag.original;positions.set(drag.quoteId,original);card.style.left=original.x+'px';card.style.top=original.y+'px';}cancel();});
        header.addEventListener('keydown',event=>{
          const delta={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[event.key];if(!delta)return;event.preventDefault();const old=positions.get(quote.id),value=point({x:old.x+delta[0],y:old.y+delta[1]});positions.set(quote.id,value);card.style.left=value.x+'px';card.style.top=value.y+'px';drawEdges();callbacks.onMove(next.id,quote.id,value);
        });
        output.addEventListener('pointerdown',event=>{
          if(event.button!==0)return;cancel();suppressClick=false;connecting={from:quote.id,contextId:next.id,id:event.pointerId,start:coordinates(event),pointer:null,moved:false};board.classList.add('is-connecting');output.setPointerCapture(event.pointerId);event.preventDefault();
        });
        output.addEventListener('pointermove',event=>{
          if(!connecting||connecting.id!==event.pointerId)return;const at=coordinates(event);if(Math.hypot(at.x-connecting.start.x,at.y-connecting.start.y)>4)connecting.moved=true;connecting.pointer=at;drawEdges();
        });
        output.addEventListener('pointerup',event=>{
          if(!connecting||connecting.id!==event.pointerId)return;
          if(!connecting.moved){connecting.id=null;callbacks.status(`Now choose IN on the excerpt to connect from [${index+1}].`);return;}
          suppressClick=true;const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.graph-node');
          if(target&&board.contains(target))connect(target.dataset.quoteId);else{cancel();callbacks.status('Drop onto another excerpt card to connect.');}
        });
        output.addEventListener('pointercancel',cancel);
        output.addEventListener('click',event=>{
          if(suppressClick&&event.detail!==0){suppressClick=false;return;}
          connecting={from:quote.id,contextId:next.id,id:null,pointer:null};board.classList.add('is-connecting');drawEdges();callbacks.status(`Choose IN on another excerpt to connect from [${index+1}].`);
        });
        input.addEventListener('click',()=>{if(!connecting){callbacks.status('First choose an OUT dot.');return;}connect(quote.id);});
      });
      drawEdges();
    }
    remove.addEventListener('click',()=>{if(context&&selected)callbacks.onUnlink(context.id,selected);});
    container.addEventListener('keydown',event=>{if(event.key==='Escape')cancel();});
    return {render};
  }
  globalThis.WordContextGraph={create,point,defaultPosition};
})();
