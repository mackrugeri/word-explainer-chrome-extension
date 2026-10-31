// Explicit user preference; never follows the website or operating-system theme.
(() => {
  const targets=new Set();let theme='light';
  function register(target){targets.add(target);target.setAttribute('data-we-theme',theme);return()=>targets.delete(target);}
  function apply(value){theme=value==='dark'?'dark':'light';for(const target of targets)if(target.isConnected)target.setAttribute('data-we-theme',theme);}
  if(location.protocol==='chrome-extension:')register(document.documentElement);
  chrome.storage.local.get({theme:'light'}).then(value=>apply(value.theme)).catch(()=>{});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.theme)apply(changes.theme.newValue);});
  globalThis.WordTheme={register};
})();
