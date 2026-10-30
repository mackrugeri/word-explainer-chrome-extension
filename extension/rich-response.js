// A small semantic response format: text/HTML structure plus native MathML.
// Never transports page HTML, CSS, scripts, event handlers or arbitrary attributes.
(() => {
  const HTML=new Set('p div span strong b em i u s del blockquote ul ol li h1 h2 h3 h4 h5 h6 pre code br hr table thead tbody tfoot tr th td a sup sub'.split(' '));
  const MATH=new Set('math semantics mrow mi mn mo mtext mspace msup msub msubsup mfrac msqrt mroot mtable mtr mtd mover munder munderover mfenced menclose mpadded mstyle mphantom mmultiscripts mprescripts none'.split(' '));
  const MATH_ATTRS=new Set('display mathvariant stretchy fence separator accent accentunder linethickness rowalign columnalign columnspan rowspan lspace rspace width height depth notation'.split(' '));
  const NS='http://www.w3.org/1998/Math/MathML';
  const safeURL=value=>{try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href:null;}catch{return null;}};
  function validate(value,maxText=12000){
    let count=0,text=0;
    function walk(item,depth=0,inMath=false){
      if(++count>2200||depth>36)throw Error('Response too complex');
      if(typeof item==='string'){text+=item.length;if(text>maxText)throw Error('Response too long');return item;}
      if(!item||typeof item!=='object'||!(inMath?MATH.has(item.tag):HTML.has(item.tag)||item.tag==='math')||!Array.isArray(item.children))throw Error('Invalid response');
      const math=inMath||item.tag==='math',attrs={};
      for(const [key,value]of Object.entries(item.attrs||{})){
        if(typeof value!=='string')continue;
        if(math&&MATH_ATTRS.has(key)&&value.length<=40&&/^[\w .+%(),=-]+$/.test(value))attrs[key]=value;
        if(!math&&item.tag==='a'&&key==='href'){const href=safeURL(value);if(href)attrs.href=href;}
        if(!math&&['th','td'].includes(item.tag)&&['colspan','rowspan'].includes(key)&&/^[1-9]\d?$/.test(value))attrs[key]=value;
      }
      return {tag:item.tag,attrs,children:item.children.map(child=>walk(child,depth+1,math))};
    }
    try{
      if(value?.version!==1||!Array.isArray(value.children)||value.children.length>2200)return null;
      const result={version:1,children:value.children.map(child=>walk(child))};
      return JSON.stringify(result).length<=180000?result:null;
    }catch{return null;}
  }
  function capture(element,maxText=12000){
    if(!element?.childNodes)return null;
    let count=0,text=0;
    function walk(node,depth=0,inMath=false){
      if(++count>2200||depth>36)throw Error('Response too complex');
      if(node.nodeType===3){text+=node.data.length;if(text>maxText)throw Error('Response too long');return node.data;}
      if(node.nodeType!==1)return null;
      const tag=node.localName?.toLowerCase();
      if(['script','style','iframe','object','embed','svg','button','textarea','input','annotation','annotation-xml'].includes(tag)||node.hidden)return null;
      if(!inMath&&node.matches?.('.katex,.katex-display,mjx-container')){
        const math=node.querySelector('math');
        if(math){const result=walk(math,depth+1,true);if(result){result.attrs.display=node.matches('.katex-display')||node.closest('.katex-display')||node.getAttribute('display')==='true'?'block':result.attrs.display||'inline';}return result;}
      }
      if(!inMath&&(node.getAttribute('aria-hidden')==='true'||node.matches?.('.katex-html')))return null;
      const math=inMath||tag==='math',children=[...node.childNodes].map(child=>walk(child,depth+1,math)).filter(child=>child!==null);
      if(!(math?MATH.has(tag):HTML.has(tag)))return {tag:math?'mrow':'span',attrs:{},children};
      const attrs={};
      for(const attr of node.attributes||[])if(math?MATH_ATTRS.has(attr.name):['href','colspan','rowspan'].includes(attr.name))attrs[attr.name]=attr.name==='href'?node.href:attr.value;
      return {tag,attrs,children};
    }
    try{return validate({version:1,children:[...element.childNodes].map(node=>walk(node)).filter(node=>node!==null)},maxText);}catch{return null;}
  }
  function render(target,value,fallback=''){
    const safe=validate(value);
    if(!safe){target.textContent=fallback;target.classList?.remove('rich-response');return false;}
    const doc=target.ownerDocument;
    function build(item,inMath=false){
      if(typeof item==='string')return doc.createTextNode(item);
      const math=inMath||item.tag==='math',node=math?doc.createElementNS(NS,item.tag):doc.createElement(item.tag);
      for(const [key,value]of Object.entries(item.attrs))node.setAttribute(key,value);
      if(item.tag==='a'){node.target='_blank';node.rel='noopener noreferrer';}
      for(const child of item.children)node.appendChild(build(child,math));
      if(item.tag==='math'&&!inMath){const wrapper=doc.createElement(item.attrs.display==='block'?'div':'span');wrapper.className=item.attrs.display==='block'?'we-math-block':'we-math-inline';wrapper.appendChild(node);return wrapper;}
      if(item.tag==='table'){const wrapper=doc.createElement('div');wrapper.className='we-table';wrapper.appendChild(node);return wrapper;}
      return node;
    }
    const fragment=doc.createDocumentFragment();for(const child of safe.children)fragment.appendChild(build(child));
    target.replaceChildren(fragment);target.classList.add('rich-response');return true;
  }
  const css=`.rich-response{white-space:normal!important;overflow-wrap:anywhere}.rich-response p{margin:.65em 0}.rich-response p:first-child{margin-top:0}.rich-response p:last-child{margin-bottom:0}.rich-response h1,.rich-response h2,.rich-response h3,.rich-response h4,.rich-response h5,.rich-response h6{font-size:1.1em;line-height:1.4;margin:1em 0 .45em;font-weight:650}.rich-response ul,.rich-response ol{padding-left:1.5em;margin:.6em 0}.rich-response li{margin:.25em 0}.rich-response a{color:inherit;text-decoration:underline}.rich-response blockquote{margin:.6em 0;padding-left:12px;border-left:3px solid #77baa0}.rich-response code{font: .85em/1.5 ui-monospace,monospace;white-space:pre-wrap}.rich-response pre{max-width:100%;overflow:auto;padding:10px;background:#748b7914;border-radius:8px;white-space:pre}.rich-response pre code{white-space:pre}.rich-response .we-math-block{display:block;max-width:100%;overflow-x:auto;padding:12px 2px;overscroll-behavior-x:contain}.rich-response .we-math-inline{display:inline-block;max-width:100%;overflow-x:auto;vertical-align:middle;padding:2px 0}.rich-response math{font-family:math;font-size:1.08em;overflow-wrap:normal}.rich-response .we-table{max-width:100%;overflow:auto}.rich-response table{border-collapse:collapse;font-size:.9em;min-width:100%}.rich-response th,.rich-response td{border:1px solid #80998a66;padding:6px 8px;text-align:start}.rich-response hr{border:0;border-top:1px solid #80998a66;margin:1em 0}`;
  globalThis.WordRichResponse={capture,validate,render,css};
})();
