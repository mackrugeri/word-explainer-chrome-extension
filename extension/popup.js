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

globalThis.WordUIIcons?.decorate(document);

document.getElementById("pdf-reader")?.addEventListener("click",()=>{
  chrome.tabs.query({active:true,currentWindow:true}).then(([tab])=>{if(!Number.isInteger(tab?.id))throw Error();return chrome.sidePanel.open({tabId:tab.id});}).catch(()=>{popupStatus.textContent="Select PDF text and use its right-click menu to open PDF actions.";popupStatus.hidden=false;});
});
