// Static, locally bundled outline icons. No icon fonts, requests or observers.
(() => {
  const paths={
    sound:['M4 9H1v6h3l5 4V5L4 9Z','M13 8a6 6 0 0 1 0 8','M16 5a10 10 0 0 1 0 14'],
    chat:['M20 11a8 8 0 0 1-8 8H5l-4 3V11a9 9 0 0 1 18-1','M6 10h8','M6 14h5'],
    summary:['M5 4h14v16H5V4Z','M8 8h8','M8 12h8','M8 16h5'],
    note:['M5 3h14v13l-5 5H5V3Z','M14 21v-5h5','M8 8h8','M8 12h5'],
    translate:['M3 5h12','M9 2v3','M6 5c0 5 3 8 7 10','M13 5c-1 5-4 8-9 11','M14 21l4-10 4 10','M15 18h6'],
    math:['M5 5h14L11 12l8 7H5'],
    book:['M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z','M12 5v15'],
    link:['M10 14l4-4','M8 15l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0','M16 9l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0'],
    save:['M4 3h13l4 4v14H3V3h1Z','M7 3v6h10V3','M7 21v-7h10v7'],
    settings:['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z','m9 3-1 3-3 1-2 3 2 2-1 3 2 3h3l2 3 3-1 1-3 3-1 2-3-2-2 1-3-2-3h-3l-2-3-3 1Z'],
    refresh:['M20 7v5h-5','M4 17v-5h5','M5 8a7 7 0 0 1 12-3l3 3','M19 16a7 7 0 0 1-12 3l-3-3'],
    trash:['M3 6h18','M9 6V3h6v3','M5 6l1 15h12l1-15','M10 10v7','M14 10v7'],
    download:['M12 3v12','m7 10 5 5 5-5','M4 16v5h16v-5'],
    plus:['M12 4v16','M4 12h16']
  };
  const map={toggle:'book','page-summary':'summary','page-summary-refresh':'refresh',speak:'sound',listen:'sound','equation-speak':'math',equation:'math','ask-llm':'chat',ask:'chat',summarize:'summary',translate:'translate','notes-taken':'note','paper-explanation':'book','cross-context':'link',contexts:'link',settings:'settings',save:'save','storage-refresh':'refresh',download:'download',clear:'trash',delete:'trash','delete-confirm':'trash','reading-mode':'book','math-mode':'math','save-draft':'save'};
  const css='.we-button-icon{display:inline-block;width:15px;height:15px;flex:none;vertical-align:-3px;margin-inline-end:6px;pointer-events:none}';
  function decorate(scope){
    const doc=scope.ownerDocument||scope;if(!scope.querySelectorAll)return;
    const container=scope.nodeType===9?doc.head:scope;
    if(container&&!container.querySelector('style[data-we-icons]')){const style=doc.createElement('style');style.dataset.weIcons='';style.textContent=css;container.appendChild(style);}
    for(const button of scope.querySelectorAll('button')){
      if(button.querySelector('.we-button-icon')||button.textContent.trim().length<2)continue;
      const key=map[button.id]||(button.classList.contains('storage-remove')?'trash':button.type==='submit'?(button.closest('#create-form')?'plus':'save'):null);
      if(!key)continue;
      const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');
      for(const [name,value]of Object.entries({viewBox:'0 0 24 24',width:'15',height:'15',fill:'none',stroke:'currentColor','stroke-width':'1.65','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false',class:'we-button-icon'}))svg.setAttribute(name,value);
      for(const d of paths[key]){const path=doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);svg.appendChild(path);}
      button.prepend(svg);
    }
  }
  globalThis.WordUIIcons={decorate};
})();
