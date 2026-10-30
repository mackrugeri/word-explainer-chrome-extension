// Exact quote + both surrounding contexts. Ambiguous matches are never guessed.
(() => {
  function locate(text,anchor){
    const matches=[];let from=0;
    while(anchor.exact&&(from=text.indexOf(anchor.exact,from))!==-1){
      const end=from+anchor.exact.length;
      if((!anchor.prefix||text.slice(Math.max(0,from-anchor.prefix.length),from)===anchor.prefix)&&(!anchor.suffix||text.slice(end,end+anchor.suffix.length)===anchor.suffix))matches.push(from);
      from++;
    }
    return matches.length===1?matches[0]:null;
  }
  function index(doc){
    const nodes=[],walker=doc.createTreeWalker(doc.body,4,{acceptNode(node){return node.parentElement?.closest('script,style,noscript,input,textarea,select,[contenteditable]:not([contenteditable="false"]),[data-word-notes]')?2:1;}});
    let node,text='';while(node=walker.nextNode()){nodes.push({node,start:text.length});text+=node.data;}
    return {text,nodes};
  }
  function capture(doc,range){
    if(!range||range.collapsed)return null;
    const data=index(doc);
    function offset(container,offset){
      const textNode=data.nodes.find(n=>n.node===container);
      if(textNode)return textNode.start+offset;
      if(container.nodeType!==1||!doc.body.contains(container))return null;
      const prefix=doc.createRange();prefix.selectNodeContents(doc.body);prefix.setEnd(container,offset);
      let length=0;
      for(const entry of data.nodes){if(prefix.comparePoint(entry.node,entry.node.length)===0)length+=entry.node.length;else break;}
      return length;
    }
    const start=offset(range.startContainer,range.startOffset),end=offset(range.endContainer,range.endOffset);
    if(start===null||end===null||end<=start)return null;
    const anchor={exact:data.text.slice(start,end),prefix:data.text.slice(Math.max(0,start-80),start),suffix:data.text.slice(end,end+80)};
    return anchor.exact&&anchor.exact.length<=8000&&locate(data.text,anchor)===start?anchor:null;
  }
  function resolve(doc,anchor){const data=index(doc),start=locate(data.text,anchor);if(start===null)return null;const end=start+anchor.exact.length;const a=data.nodes.find(n=>n.start+n.node.length>start),b=data.nodes.find(n=>n.start+n.node.length>=end);if(!a||!b)return null;const range=doc.createRange();range.setStart(a.node,start-a.start);range.setEnd(b.node,end-b.start);return range;}
  globalThis.WordNotesAnchor={locate,index,capture,resolve};
})();
