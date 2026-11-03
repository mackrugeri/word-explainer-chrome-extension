const settingsButton = document.getElementById("settings");
const popupStatus = document.getElementById("popup-status");
settingsButton.addEventListener("click", async () => {
  settingsButton.disabled = true;
  popupStatus.hidden = true;
  try {
    await chrome.runtime.openOptionsPage();
  } catch {
    popupStatus.textContent = "Could not open settings. Reload Word Explainer from Chrome's Extensions page and retry.";
    popupStatus.hidden = false;
  } finally {
    settingsButton.disabled = false;
  }
});

const contextsButton = document.getElementById("contexts");
contextsButton.addEventListener("click",async()=>{
  contextsButton.disabled=true;popupStatus.hidden=true;
  try{const result=await chrome.runtime.sendMessage({type:"OPEN_CONTEXTS"});if(!result?.ok)throw new Error("Unavailable");}
  catch{popupStatus.textContent="Could not open contexts. Reload the extension and retry.";popupStatus.hidden=false;}
  finally{contextsButton.disabled=false;}
});

const dashboardButton=document.getElementById('reading-dashboard');
dashboardButton?.addEventListener?.('click',async()=>{
  dashboardButton.disabled=true;popupStatus.hidden=true;
  try{const reply=await chrome.runtime.sendMessage({type:'OPEN_READING_DASHBOARD'});if(!reply?.ok)throw Error('Unavailable');}
  catch{popupStatus.textContent='Could not open the reading dashboard. Reload the extension and retry.';popupStatus.hidden=false;}
  finally{dashboardButton.disabled=false;}
});

globalThis.WordUIIcons?.decorate(document);
