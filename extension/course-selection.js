// Selection bridge only for Google Skills course content hosted on Google Storage.
(() => {
  if(window.top===window)return;
  try{const parent=new URL(document.referrer);if(!['www.skills.google','skills.google'].includes(parent.hostname))return;}catch{return;}
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(sender.id!==chrome.runtime.id||message.type!=='COLLECT_COURSE_SELECTION')return;
    const selected=window.getSelection();const text=String(selected||'').trim();
    if(!text||!selected.rangeCount)return;
    const range=selected.getRangeAt(0),node=range.commonAncestorContainer;
    const container=node?.nodeType===1?node:node?.parentElement;
    if(container?.isContentEditable||container?.closest?.('input,textarea'))return;
    if(text.length>8000){reply({ok:false,error:'Select up to 8,000 characters from the lesson.'});return;}
    const rect=range.getBoundingClientRect();
    reply({ok:true,text,sourceUrl:location.href,rect:{left:rect.left,top:rect.top,bottom:rect.bottom}});
  });
})();
