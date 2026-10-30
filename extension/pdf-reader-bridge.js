// A reader is an extension page, so messages use runtime routing, not content-script routing.
globalThis.WordPDFReader={tabId:null,ready:chrome.tabs.getCurrent().then(tab=>{globalThis.WordPDFReader.tabId=tab.id;return tab.id;})};
