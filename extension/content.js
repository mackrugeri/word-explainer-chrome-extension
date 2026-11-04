(() => {
  const BUILD="0.4.49";
  const pronunciationAndTranslationOnly=typeof location!=="undefined"&&location.hostname==="chatgpt.com";
  let contextSelection="", highlightRange=null, selectionLauncher=null;
  const highlighter=globalThis.WordHighlighter?.createPersistent();
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;z-index:2147483647;display:none";
  globalThis.WordTheme?.register(host);
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `
    <style>
:host{all:initial}*{box-sizing:border-box}[hidden]{display:none!important}
.card{--we-bg:#fff;--we-text:#222e27;--we-muted:#647268;--we-line:#dce3dc;--we-soft:#f3f6f1;--we-accent:#245d47;--we-on-accent:#fff;--we-tint:#e9f2eb;--we-error:#a2352d;width:min(392px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;background:var(--we-bg);color:var(--we-text);border:1px solid var(--we-line);border-radius:14px;box-shadow:0 16px 40px #15271b1a,0 2px 7px #15271b12;font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left;color-scheme:light;-webkit-font-smoothing:antialiased}
.card:focus{outline:none}
:host([data-we-theme="dark"]) .card{--we-bg:#1d2720;--we-text:#ecf0ea;--we-muted:#adbaaf;--we-line:#38473b;--we-soft:#26332a;--we-accent:#b3d8bf;--we-on-accent:#182a1e;--we-tint:#2c3f31;--we-error:#f1a79d;color-scheme:dark}
button{font:inherit;cursor:pointer;transition:background-color .12s,border-color .12s}button:focus-visible,.result-body:focus-visible{outline:3px solid #6ba788;outline-offset:3px}button:disabled{cursor:wait;opacity:.5}.header{display:flex;align-items:center;gap:9px;padding:14px 16px;border-bottom:1px solid var(--we-line);margin-bottom:15px}.mark{display:grid;place-items:center;width:30px;height:30px;flex:none;border:1px solid var(--we-line);background:var(--we-soft);color:var(--we-accent);border-radius:8px;font:650 17px/1 Georgia,serif}.brand-stack{min-width:0;flex:1}.brand{display:block;font-weight:650;font-size:12px}.tagline{display:block;color:var(--we-muted);font-size:10px;margin-top:1px}.settings,.close{display:grid;place-items:center;width:30px;height:30px;flex:none;padding:0;border:0;border-radius:7px;background:transparent;color:var(--we-muted);font-size:18px}.close{font-size:22px}.settings:hover,.close:hover{background:var(--we-soft);color:var(--we-text)}.selection-label{padding:0 16px;margin-bottom:5px;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--we-muted)}.word{margin:0 16px;font-size:18px;line-height:1.45;font-weight:550;overflow-wrap:anywhere;max-height:82px;overflow:auto;scrollbar-width:thin}
.actions{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;padding:14px 16px}.action{min-width:0;min-height:38px;border:1px solid var(--we-line);border-radius:8px;padding:8px;background:var(--we-bg);color:var(--we-text);font-size:12px;font-weight:550;text-align:center}.action:not(.primary):hover{background:var(--we-soft);border-color:var(--we-accent)}.primary{background:var(--we-accent);color:var(--we-on-accent);border-color:var(--we-accent)}.primary:hover{filter:brightness(1.08)}#ask-llm{grid-column:span 3;grid-row:1}#summarize{grid-column:span 3;grid-row:1}#speak,#translate,#notes-taken{grid-column:span 2;grid-row:2}#equation-speak{grid-column:1/-1;grid-row:3;min-height:32px;text-align:left;font-size:11px;color:var(--we-muted)}#paper-explanation{grid-column:1/-1;grid-row:4;text-align:left;font-size:11px;min-height:34px;background:var(--we-soft)}.actions.limited #speak,.actions.limited #translate,.actions.limited #notes-taken{grid-row:1}.actions.limited #equation-speak{grid-row:2}
.highlights{margin:0 16px 12px;padding:10px 11px;background:var(--we-soft);border:1px solid var(--we-line);border-radius:9px}.highlight-header{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px;font-weight:650}.highlight-remove{border:0;background:transparent;color:var(--we-muted);padding:2px 0;font-size:10px}.highlight-remove:hover{color:var(--we-error);text-decoration:underline}.highlight-colors{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:7px;margin-top:9px}.highlight-color{display:grid;place-items:center;min-width:0;width:100%;height:24px;padding:0;border:1px solid #ffffff20;border-radius:6px;color:#fff;font-size:14px;font-weight:700}.highlight-color:hover,.highlight-color[aria-pressed="true"]{outline:2px solid var(--we-accent);outline-offset:2px}.highlight-color:disabled{opacity:.35;cursor:default}.highlight-note{color:var(--we-muted);font-size:10px;line-height:1.4;margin-top:8px}.equation-note{margin:0 16px 12px;font-size:11px;color:var(--we-muted);max-height:100px;overflow:auto;overflow-wrap:anywhere}.equation-note:empty{display:none}.context-action{display:block;margin:0 16px 12px;width:calc(100% - 32px);padding:7px 10px;border:1px solid var(--we-line);border-radius:8px;background:transparent;color:var(--we-muted);font-size:11px;text-align:left}.context-action:hover{background:var(--we-soft);color:var(--we-text)}.llm-choices{padding:0 16px 12px;color:var(--we-muted);font-size:11px}.provider-actions{display:flex;gap:7px;margin-top:7px}.provider-actions .action{flex:1}
.result{margin:0 16px 12px;padding:12px;background:var(--we-bg);border:1px solid var(--we-line);border-radius:9px;overflow:hidden;overscroll-behavior:contain;scrollbar-width:thin}.result-body{max-height:min(250px,45dvh);overflow:auto;overscroll-behavior:contain;scrollbar-width:thin}summary.status{cursor:pointer;margin-bottom:0}details[open] summary.status{margin-bottom:10px}.status{display:flex;align-items:center;gap:7px;color:var(--we-muted);font-size:10px;font-weight:550;line-height:1.5;margin-bottom:10px}#status,#translation-status,#summary-status{flex:1;min-width:0;overflow-wrap:anywhere}.dot{width:5px;height:5px;border-radius:50%;background:var(--we-accent);flex:none}.loading .dot{animation:pulse 1.3s ease-in-out infinite}.error .dot{background:var(--we-error)}.error .status{color:var(--we-error)}.answer{white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px;line-height:1.7}.answer:empty{display:none}.translation{font-family:"Noto Nastaliq Urdu","Noto Naskh Arabic","Geeza Pro",serif;line-height:1.9}.speaker{display:grid;place-items:center;flex:none;width:30px;height:30px;border:1px solid var(--we-line);border-radius:7px;background:var(--we-bg);color:var(--we-accent);padding:0;font-size:14px}.speaker:hover{background:var(--we-tint)}.speech-note{color:var(--we-muted);font-size:11px;margin-top:8px}.speech-note:empty{display:none}.footer{padding:9px 16px;border-top:1px solid var(--we-line);color:var(--we-muted);font-size:10px;display:flex;align-items:center;justify-content:space-between;gap:12px}.version{font-variant-numeric:tabular-nums}#drag-handle{cursor:grab;touch-action:none;user-select:none}#drag-handle:active{cursor:grabbing}@keyframes pulse{50%{opacity:.3}}@media(max-width:340px){.highlight-colors{gap:5px}.highlight-color{height:22px}.word{font-size:16px}}@media(pointer:coarse){.action,.settings,.close,.speaker{min-height:44px}.settings,.close,.speaker{width:38px}}@media(prefers-reduced-motion:reduce){.loading .dot{animation:none}button{transition:none}}
.reading-modes{display:flex;gap:3px;margin:0 16px 14px;padding:3px;border:1px solid var(--we-line);border-radius:8px;background:var(--we-soft)}.reading-modes button{flex:1;border:0;border-radius:5px;padding:6px;background:transparent;color:var(--we-muted);font-size:11px;font-weight:550;min-height:30px}.reading-modes button[aria-pressed="true"]{background:var(--we-bg);color:var(--we-text);box-shadow:0 1px 3px #15271b12}.mode-note{margin:0 16px 12px;font-size:11px;color:var(--we-muted)}
@media(max-width:340px){.actions #speak,.actions #translate,.actions #notes-taken{font-size:11px;padding-inline:4px;white-space:nowrap}.actions #speak .we-button-icon,.actions #translate .we-button-icon,.actions #notes-taken .we-button-icon{width:13px;height:13px;margin-inline-end:4px}}
.actions #llm-choices{grid-column:1/-1;grid-row:2;padding:12px;border:1px solid var(--we-line);border-radius:9px;background:var(--we-soft);font-size:11px}.actions #llm-choices .action{min-height:44px;font-size:13px;line-height:1.5}.actions:has(#llm-choices:not([hidden])) #speak,.actions:has(#llm-choices:not([hidden])) #translate,.actions:has(#llm-choices:not([hidden])) #notes-taken{grid-row:3}.actions:has(#llm-choices:not([hidden])) #equation-speak{grid-row:4}.actions:has(#llm-choices:not([hidden])) #paper-explanation{grid-row:5}
      .selection-reference-list{white-space:normal;font-size:14px;line-height:1.6}.selection-reference-list article{padding:12px 0;border-top:1px solid var(--we-line)}.selection-reference-list a{color:var(--we-accent);font-weight:600}.selection-reference-list small{display:block;color:var(--we-muted);font-size:11px}.selection-reference-list p{margin:6px 0}
.card{width:min(360px,calc(100vw - 24px));height:calc(100dvh - 24px);max-height:calc(100dvh - 24px);border-radius:12px;box-shadow:-8px 0 32px #15271b18,0 2px 8px #15271b12}.header{position:sticky;top:0;z-index:2;background:var(--we-bg);padding:12px 14px}.footer{position:sticky;bottom:0;background:var(--we-bg)}#drag-handle,#drag-handle:active{cursor:default;touch-action:auto}.restore-selection{position:fixed;right:0;top:104px;width:30px;height:60px;border:1px solid #dce3dc;border-right:0;border-radius:10px 0 0 10px;background:#fff;color:#245d47;box-shadow:-2px 2px 9px #15271b1a;font:28px/1 system-ui;cursor:pointer;opacity:.8}.restore-selection:hover,.restore-selection:focus-visible{opacity:1;outline:2px solid #6ba788;outline-offset:-3px}:host([data-we-theme="dark"]) .restore-selection{background:#1d2720;color:#b3d8bf;border-color:#38473b}
.card{display:flex;flex-direction:column;overflow:hidden}.header,.highlights,.footer{flex:none}.header{margin-bottom:0}.selection-content{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;padding-top:15px;padding-bottom:8px}.footer{position:static}.highlights{margin-top:0}.actions .action{font-size:12px}.actions #notes-taken{font-size:11px}.actions #selection-references,.actions #cross-context{grid-column:span 3;grid-row:3}.actions #equation-speak,.actions #paper-explanation{grid-column:span 3;grid-row:4;min-height:38px;text-align:center;font-size:12px;color:var(--we-text);background:var(--we-bg)}.actions:has(#llm-choices:not([hidden])) #selection-references,.actions:has(#llm-choices:not([hidden])) #cross-context{grid-row:4}.actions:has(#llm-choices:not([hidden])) #equation-speak,.actions:has(#llm-choices:not([hidden])) #paper-explanation{grid-row:5}
.selection-tooltip{position:fixed;z-index:4;max-width:min(260px,calc(100vw - 16px));padding:8px 11px;border:1px solid #435c4d;border-radius:7px;background:#233c2e;color:#fff;box-shadow:0 4px 14px #15271b30;font:12px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left;white-space:normal;overflow-wrap:anywhere;pointer-events:none}:host([data-we-theme="dark"]) .selection-tooltip{background:#e4efe5;color:#1b3022;border-color:#b7cabc}
.result{padding:0;margin-top:16px;border-color:#b6cfbf;border-left:3px solid #3a7456;border-radius:10px;background:var(--we-bg);box-shadow:0 2px 8px #245d470c}.result summary.status{padding:11px 12px;margin:0;background:#edf5ef;color:#28523b;font-size:12px;font-weight:650;gap:8px;line-height:1.5}.result summary.status>span:not(.dot){flex:1;min-width:0;overflow-wrap:anywhere}.result summary.status:after{content:"+";flex:none;font-size:17px;font-weight:500}.result[open] summary.status{margin:0;border-bottom:1px solid #d3e3d7}.result[open] summary.status:after{content:"−"}.result .dot{background:#3a7456;width:6px;height:6px}.result .result-body{padding:13px 12px}.result.error{border-color:#d9b7b0;border-left-color:var(--we-error)}.result.error summary.status{background:#fff0ed;color:#923b31}.result.error .dot{background:var(--we-error)}.actions #llm-choices{background:#edf5ef;border-color:#b6cfbf;border-left:3px solid #3a7456;color:#28523b;box-shadow:0 2px 8px #245d470c}.actions #provider-label{font-size:12px;font-weight:650}:host([data-we-theme="dark"]) .result{border-color:#4d6b56;border-left-color:#a8d0b4}:host([data-we-theme="dark"]) .result summary.status,:host([data-we-theme="dark"]) .actions #llm-choices{background:#293f30;color:#e0f0e4;border-color:#4d6b56}:host([data-we-theme="dark"]) .result[open] summary.status{border-bottom-color:#4d6b56}:host([data-we-theme="dark"]) .result .dot{background:#a8d0b4}:host([data-we-theme="dark"]) .result.error summary.status{background:#4c302c;color:#ffc9be}
 .history-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 14px;border-bottom:1px solid var(--we-line);background:var(--we-soft);flex:none}.history-nav button{display:grid;place-items:center;width:32px;height:28px;border:1px solid var(--we-line);border-radius:6px;background:var(--we-bg);color:var(--we-accent);font-size:18px}.history-nav button:disabled{cursor:default;opacity:.35}.history-nav button:not(:disabled):hover{border-color:var(--we-accent)}#history-position{color:var(--we-muted);font-size:11px;font-variant-numeric:tabular-nums}.history-note{margin:8px 16px;font-size:11px;color:var(--we-muted)}
 .result-body{display:block;min-height:0;max-height:min(340px,44dvh);overflow:auto;overscroll-behavior-y:auto;scrollbar-gutter:stable;scrollbar-width:auto;scrollbar-color:#8da998 var(--we-soft);touch-action:pan-x pan-y}.result-body::-webkit-scrollbar{width:9px;height:9px}.result-body::-webkit-scrollbar-thumb{background:#8da998;border:2px solid var(--we-bg);border-radius:8px}.result-body::-webkit-scrollbar-track{background:var(--we-soft)}
 .highlights{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:5px 7px;margin:0 14px;padding:10px 0 8px;border:0;border-bottom:1px solid var(--we-line);border-radius:0;background:var(--we-bg)}.highlight-header{display:contents}.highlight-header>span{grid-column:1;grid-row:1;font-size:10px;font-weight:600;color:var(--we-muted)}.highlight-remove{grid-column:3;grid-row:1;font-size:10px;padding:4px 0}.highlight-colors{grid-column:2;grid-row:1;margin:0;gap:4px}.highlight-color{height:22px;border-radius:4px;font-size:12px}.highlight-note{grid-column:1/-1;grid-row:2;margin:0;font-size:10px;line-height:1.4}.history-nav{margin-top:0}@media(max-width:340px){.highlights{grid-template-columns:1fr auto;gap:5px 7px}.highlight-header>span{grid-column:1}.highlight-remove{grid-column:2}.highlight-colors{grid-column:1/-1;grid-row:2;gap:5px}.highlight-note{grid-row:3}.highlight-color{height:22px}}@media(pointer:coarse){.highlight-color{height:28px}}
 .highlights{display:block;margin:10px 14px 8px;padding:10px 12px;background:var(--we-soft);border:1px solid var(--we-line);border-radius:10px}.highlight-header{display:flex;align-items:center;justify-content:space-between;gap:10px}.highlight-header>span{font-size:11px;font-weight:650;color:var(--we-text)}.highlight-remove{display:inline-flex;align-items:center;justify-content:center;min-height:24px;padding:3px 8px;border:1px solid var(--we-line);border-radius:6px;background:var(--we-bg);color:var(--we-muted);font-size:10px;font-weight:550;line-height:1.4}.highlight-remove:hover{border-color:var(--we-accent);color:var(--we-accent);text-decoration:none}.highlight-colors{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:6px;margin-top:9px}.highlight-color{width:100%;height:auto;aspect-ratio:1;border-radius:50%;border:2px solid var(--we-bg);box-shadow:0 0 0 1px #15271b12;font-size:12px;transition:transform .12s,box-shadow .12s}.highlight-color:hover{transform:translateY(-1px);outline-offset:1px}.highlight-color[aria-pressed="true"]{outline:2px solid var(--we-accent);outline-offset:1px}.highlight-note{margin-top:7px;font-size:10px;line-height:1.45}.highlight-note:empty{display:none}@media(max-width:340px){.highlight-colors{gap:4px}}@media(pointer:coarse){.highlight-colors{grid-template-columns:repeat(5,minmax(0,1fr))}.highlight-color{width:32px;height:32px;justify-self:center}.highlight-remove{min-height:32px}}@media(prefers-reduced-motion:reduce){.highlight-color{transition:none}}
${globalThis.WordRichResponse?.css||""}
    </style>
    <section class="card" id="selection-card" tabindex="-1" aria-label="Word Explainer">
      <div class="header" id="drag-handle" title="Selection tools"><span class="mark" aria-hidden="true">W</span><div class="brand-stack"><span class="brand">Word Explainer</span><span class="tagline">Selection tools</span></div><button class="settings" id="open-settings" type="button" aria-label="Settings" title="Settings">⚙</button><button class="close" id="minimize-selection" type="button" aria-label="Minimize selection tools" title="Minimize to edge">›</button><button class="close" id="close" type="button" aria-label="Close">×</button></div>
      <div class="highlights" role="group" aria-label="Highlight selected text"><div class="highlight-header"><span>Highlight</span><button class="highlight-remove" id="remove-highlight" type="button" aria-label="Remove highlights from selected text" title="Remove highlights from selected text">Clear</button></div><div class="highlight-colors" id="highlight-colors"></div><div class="highlight-note" id="highlight-note" role="status" aria-live="polite"></div></div>
      <nav class="history-nav" aria-label="Selection history"><button id="history-previous" type="button" aria-label="Previous selection" title="Previous selection" disabled>←</button><span id="history-position" role="status" aria-live="polite">0 / 0</span><button id="history-next" type="button" aria-label="Next selection" title="Next selection" disabled>→</button></nav>
      <div class="selection-content">
      <div class="reading-modes" role="group" aria-label="Reading mode"><button id="reading-mode" type="button" aria-pressed="true">Reading</button><button id="math-mode" type="button" aria-pressed="false">Math article</button></div>
      <div class="selection-label">Selected text</div>
      <div class="word" id="word" dir="auto" aria-live="polite"></div><p class="history-note" id="history-note" role="status" hidden></p>
      <div class="actions" id="actions"><button class="action primary" id="ask-llm" type="button" aria-expanded="false" aria-controls="llm-choices">Ask to LLM</button><button class="action" id="summarize" type="button">Summarize</button><div class="llm-choices" id="llm-choices" role="group" aria-label="Choose an AI provider" hidden><span id="provider-label">Choose a provider</span><div class="provider-actions"><button class="action primary" id="explain" type="button">ChatGPT</button><button class="action primary" id="gemini" type="button">Gemini</button></div></div><button class="action" id="speak" type="button">Listen</button><button class="action" id="translate" type="button">Translate</button><button class="action" id="notes-taken" type="button" aria-label="Notes Taken" title="Notes Taken">Notes</button><button class="action" id="selection-references" type="button" aria-label="Selection references" title="Selection references">References</button><button class="action" id="cross-context" type="button" aria-label="Cross-page context" title="Cross-page context">Context</button><button class="action" id="equation-speak" type="button" aria-label="Greek alphabet pronunciation" title="Greek alphabet pronunciation" aria-pressed="false">Greek</button><button class="action" id="paper-explanation" type="button" aria-label="Explain mathematical equation from this paper" title="Explain mathematical equation from this paper">Equation</button></div>
      <p class="mode-note" id="math-mode-note" role="status" hidden></p>
      <div id="equation-note" class="equation-note" role="status" aria-live="polite"></div>

      <details class="result" id="result" hidden open><summary class="status"><span class="dot" aria-hidden="true"></span><span id="status">AI explanation</span></summary><div class="result-body" tabindex="0" aria-label="AI explanation"><div class="answer" id="answer" dir="auto"></div></div></details>
      <details class="result" id="references-result" hidden open><summary class="status"><span class="dot" aria-hidden="true"></span><span id="references-status">Selection references</span></summary><div class="result-body" tabindex="0" aria-label="Selection references"><div class="answer" id="references-answer"></div></div></details>
      <details class="result" id="summary-result" hidden open><summary class="status"><span class="dot" aria-hidden="true"></span><span id="summary-status">Summary</span></summary><div class="result-body" tabindex="0" aria-label="Summary"><div class="answer" id="summary-answer" dir="auto"></div></div></details>
      <details class="result" id="translation-result" hidden open><summary class="status"><span class="dot" aria-hidden="true"></span><span id="translation-status">Translation</span></summary><div class="result-body" tabindex="0" aria-label="Translation"><button class="speaker" id="listen-translation" type="button" aria-label="Listen to translation" title="Listen to translation" hidden>🔊</button><div class="answer translation" id="translation-answer" dir="auto"></div><div class="speech-note" id="speech-note" role="status"></div></div></details>
      </div>
      <div class="footer"><span>Esc to minimize</span><span class="version">v0.4.49</span></div>
    </section><button class="restore-selection" id="restore-selection" type="button" aria-label="Restore selection tools" title="Restore selection tools" aria-controls="selection-card" aria-expanded="false" hidden>‹</button><div class="selection-tooltip" id="selection-tooltip" role="tooltip" hidden></div>`;
  globalThis.WordUIIcons?.decorate(root);
  document.documentElement.appendChild(host);
  const tooltip=root.getElementById("selection-tooltip");let tooltipButton=null;
  tooltip.hidden=true;
  for(const button of root.querySelectorAll?.("#equation-speak,#paper-explanation,#selection-references,#cross-context,#notes-taken,#remove-highlight")||[]){button.dataset.tooltip=button.title;button.removeAttribute("title");}
  function hideTooltip(){
    tooltip.hidden=true;
    if(tooltipButton){const ids=(tooltipButton.getAttribute("aria-describedby")||"").split(/\s+/).filter(id=>id&&id!=="selection-tooltip");if(ids.length)tooltipButton.setAttribute("aria-describedby",ids.join(" "));else tooltipButton.removeAttribute("aria-describedby");}
    tooltipButton=null;
  }
  function showTooltip(button){
    if(!button?.dataset.tooltip||button.getClientRects().length===0){hideTooltip();return;}
    hideTooltip();tooltipButton=button;tooltip.textContent=button.dataset.tooltip;tooltip.hidden=false;
    const described=(button.getAttribute("aria-describedby")||"").split(/\s+/).filter(Boolean);button.setAttribute("aria-describedby",[...described,"selection-tooltip"].join(" "));
    const anchor=button.getBoundingClientRect(),tip=tooltip.getBoundingClientRect();
    tooltip.style.left=`${Math.max(8,Math.min(anchor.left+(anchor.width-tip.width)/2,innerWidth-tip.width-8))}px`;
    tooltip.style.top=`${Math.max(8,anchor.bottom+tip.height+16<=innerHeight?anchor.bottom+8:anchor.top-tip.height-8)}px`;
  }
  root.addEventListener("pointerover",event=>{const button=event.target.closest?.("button[data-tooltip]");if(button)showTooltip(button);});
  root.addEventListener("pointerout",event=>{if(tooltipButton&&!tooltipButton.contains(event.relatedTarget))hideTooltip();});
  root.addEventListener("focusin",event=>showTooltip(event.target.closest?.("button[data-tooltip]")));
  root.addEventListener("focusout",hideTooltip);root.addEventListener("pointerdown",hideTooltip);
  root.addEventListener("scroll",()=>{if(tooltipButton&&root.activeElement===tooltipButton)showTooltip(tooltipButton);else hideTooltip();},true);window.addEventListener("resize",hideTooltip);

  let settings = { askProvider:"ask", language:"en-US", rate:1, translationLanguage:"Urdu", translationFontSize:20, readingMode:"reading" };
  chrome.storage.local.get(settings).then(value => { settings=value;applyTranslationSize();applyReadingMode(); }).catch(()=>{});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==="session"&&changes.wordSelectionClearSignal?.newValue){clearSelectionHistory(changes.wordSelectionClearSignal.newValue);return;}
    if(area!=="local")return;
    for(const key of Object.keys(settings))if(changes[key])settings[key]=changes[key].newValue;
    applyTranslationSize();applyReadingMode();
  });
  let paperSelection="",paperSourceUrl="";
  let selectedText="", activeRequest=null, selectedAction="explain", selectedProvider="chatgpt";
  const answerKey=(text,action,language,provider=selectedProvider)=>`${action}|${action==="paper-explanation"?paperSourceUrl+"|":""}${action==="translate"?language:provider}|${text}`;
  let followupUI=null;
  const setBusy=value=>{followupUI?.busy(value);el("selection-references").disabled=value;el("paper-explanation").disabled=value;el("summarize").disabled=value;el("ask-llm").disabled=value;el("explain").disabled=value;el("gemini").disabled=value;el("translate").disabled=value;};
  async function send(message){
    try {
      if(!chrome.runtime?.id)throw new Error("Extension context invalidated");
      return await chrome.runtime.sendMessage(message);
    } catch(error) {
      if(/context invalidated|extension context/i.test(error?.message||""))
        throw new Error("The extension was updated. Refresh this page and retry.");
      throw error;
    }
  }
  const pending = new Map();
  const answers = new Map();let answerPage=location.href.split("#")[0];
  const el=(id)=>root.getElementById(id);
  let historyRevision=0;
  const history=globalThis.WordSelectionHistory?.create({page:()=>location.origin,onChange:state=>{historyRevision++;send({type:"SAVE_SELECTION_HISTORY",state}).catch(()=>{});}});
  function updateHistoryControls(){const position=history?.position()||{index:-1,count:0};el("history-previous").disabled=position.index<=0;el("history-next").disabled=position.index<0||position.index>=position.count-1;el("history-position").textContent=`${position.index+1} / ${position.count}`;}
  function moveHistory(direction){
    const entry=history?.move(direction);if(!entry){updateHistoryControls();return;}
    displayHistoryEntry(entry);
  }
  function displayHistoryEntry(entry){
    hide();if(plainUtterance){plainUtterance=null;speechSynthesis.cancel();}
    paperSelection=entry.paperSelection;paperSourceUrl=entry.sourceUrl;selectedText=entry.text;contextSelection=entry.text;selectedAction=entry.action;selectedProvider=entry.provider;
    const samePage=entry.sourceUrl?.split("#")[0]===location.href.split("#")[0];
    let range=samePage?entry.range:null;
    try{if(!range?.startContainer?.isConnected||!range.endContainer?.isConnected||String(range).trim()!==entry.text)range=samePage&&entry.anchor&&globalThis.WordNotesAnchor?.resolve(document,entry.anchor);if(range?.commonAncestorContainer?.ownerDocument!==document)range=null;}catch{range=null;}
    const selection=window.getSelection();selection?.removeAllRanges();
    if(range){selection.addRange(range.cloneRange());entry.range=range.cloneRange();const rect=range.getBoundingClientRect();if(rect.top<0||rect.bottom>innerHeight)(range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement)?.scrollIntoView?.({block:"center",behavior:"instant"});}
    highlightRange=range||null;el("equation-note").textContent="";el("history-note").textContent=range?"":"The original passage is no longer available here. Saved answers are still shown.";el("history-note").hidden=!!range;
    paintSelection(entry.embedded,entry);
  }
  function clearSelectionHistory(scope={}){
    try{if(scope.site&&new URL(location.href).origin!==scope.site)return;if(scope.url&&new URL(scope.url).href.split("#")[0]!==location.href.split("#")[0])return;}catch{return;}
    for(const [requestId,job]of pending){clearTimeout(job.timer);send({type:"CANCEL_EXPLANATION",requestId}).catch(()=>{});}pending.clear();followupUI?.clear();activeRequest=null;answers.clear();if(scope.kind==="page"&&scope.url)history?.removePage(scope.url);else history?.clear();
    selectedText="";contextSelection="";paperSelection="";paperSourceUrl="";highlightRange=null;spokenTranslation=null;
    if(plainUtterance){plainUtterance=null;speechSynthesis.cancel();}hide();updateHistoryControls();setBusy(false);
    for(const id of ["result","references-result","summary-result","translation-result"])el(id).hidden=true;
    if(scope.kind==="page"){highlighter?.clearPage?.().catch(()=>{});selectionLauncher?.hide();globalThis.WordNotesPanel?.clearPageUI?.();window.getSelection()?.removeAllRanges();}
  }
  el("history-previous").addEventListener("click",()=>moveHistory(-1));el("history-next").addEventListener("click",()=>moveHistory(1));

  if(pronunciationAndTranslationOnly){el("selection-references").hidden=true;el("paper-explanation").hidden=true;el("cross-context").hidden=true;el("ask-llm").hidden=true;el("summarize").hidden=true;el("actions").className="actions limited";}
  function highlightStatus(){const message=highlighter?.status?.()||"";return message==="Saved locally"?"":message;}
  function updateHighlightColor(){
    const active=highlighter?.activeColor(highlightRange);
    for(const button of el("highlight-colors").children||[]){
      const selected=button.dataset.color===active;
      button.setAttribute("aria-pressed",String(selected));button.textContent=selected?"✓":"";
    }
  }
  if(highlighter)for(const [key,label,color] of globalThis.WordHighlighter.colors){
    const button=document.createElement("button");button.type="button";button.className="highlight-color";
    button.style.backgroundColor=color;button.dataset.color=key;button.setAttribute("aria-pressed","false");button.title=label;button.setAttribute("aria-label",`Highlight ${label.toLowerCase()}`);
    button.addEventListener("click",async()=>{
      try{
        const ok=await highlighter.apply(highlightRange,key);updateHighlightColor();
        el("highlight-note").textContent=ok?(highlighter.persistent?`${label} highlight saved.`:`${label} highlighted until reload. Refresh the extension to enable saving.`):"Select webpage text again to highlight it.";
      }catch(error){el("highlight-note").textContent=error.message||"Could not save the highlight. Try again.";}
      fitPanel();
    });
    el("highlight-colors").appendChild(button);
  }
  highlighter?.ready?.then(()=>{
    updateHighlightColor();
    if(host.style.display==="block")el("highlight-note").textContent=highlightStatus();
  }).catch(()=>{el("highlight-note").textContent="Could not load saved highlights. Refresh this page to retry.";});
  el("notes-taken").addEventListener("click",()=>{
    if(globalThis.WordNotesPanel?.open(highlightRange))hide();
    else el("highlight-note").textContent="Select a uniquely identifiable passage on this webpage. Notes cannot attach to embedded or native PDF selections.";
  });
  el("remove-highlight").addEventListener("click",async()=>{
    try{
      const ok=await highlighter?.remove(highlightRange);updateHighlightColor();
      el("highlight-note").textContent=ok?"Highlight removed.":"Select webpage text again to remove highlights.";
    }catch(error){el("highlight-note").textContent=error.message||"Could not remove saved highlights. Try again.";}
  });
  function applyReadingMode(){
    const math=settings.readingMode==="math";
    el("reading-mode").setAttribute("aria-pressed",String(!math));el("math-mode").setAttribute("aria-pressed",String(math));
    el("equation-speak").hidden=!math;el("paper-explanation").hidden=!math||pronunciationAndTranslationOnly;
    const source=paperSelection||contextSelection||selectedText;
    const hasMath=globalThis.WordMathSelection?.isMath(source)??true;
    el("paper-explanation").disabled=!hasMath||!!activeRequest;
    el("math-mode-note").hidden=!math;
    el("math-mode-note").textContent=hasMath?"Select an equation to explain it using this paper.":"Select a mathematical equation first.";
    if(host.style.display==="block")fitPanel();
  }
  for(const [id,mode]of [["reading-mode","reading"],["math-mode","math"]])el(id).addEventListener("click",async()=>{
    settings.readingMode=mode;applyReadingMode();
    try{await chrome.storage.local.set({readingMode:mode});}catch{el("math-mode-note").hidden=false;el("math-mode-note").textContent="Mode changed for this page; could not save the preference.";}
  });
  applyReadingMode();
  let spokenTranslation=null, speechId=null, returnFocus=null, plainUtterance=null, minimized=false;
  const hide=()=>{ hideTooltip();const keep=!!history?.position().count;minimized=keep;el("restore-selection").hidden=!keep;el("selection-card").hidden=keep;host.style.display=keep?"block":"none";el("llm-choices").hidden=true;el("ask-llm").setAttribute("aria-expanded","false");stopTranslationSpeech();stopEquationSpeech(); };
  const dismiss=()=>{
    hide();
    if(plainUtterance){plainUtterance=null;speechSynthesis.cancel();}
    if(returnFocus?.isConnected)returnFocus.focus?.({preventScroll:true});
    returnFocus=null;
  };
  function minimizeSelection(focus=false){
    if(host.style.display!=="block"||minimized)return;
    hideTooltip();minimized=true;el("selection-card").hidden=true;el("restore-selection").hidden=false;el("restore-selection").setAttribute("aria-expanded","false");
    if(focus)el("restore-selection").focus?.({preventScroll:true});
  }
  function restoreSelection(){
    const entry=history?.current();if(entry){displayHistoryEntry(entry);return;}
    if(!selectedText)return;
    minimized=false;el("restore-selection").hidden=true;el("selection-card").hidden=false;host.style.display="block";fitPanel();
    el("selection-card").focus?.({preventScroll:true});
  }
  el("minimize-selection").addEventListener("click",()=>minimizeSelection(true));
  el("restore-selection").addEventListener("click",restoreSelection);
  function applyTranslationSize(){
    if(!spokenTranslation)return;
    const size=Number(settings.translationFontSize);
    el("translation-answer").style.fontSize=`${Number.isFinite(size)?Math.max(14,Math.min(32,size)):20}px`;
    fitPanel();
  }
  function stopTranslationSpeech(){
    if(speechId)send({type:"STOP_TRANSLATION_SPEECH"}).catch(()=>{});
    speechId=null;el("listen-translation").textContent="🔊";
    el("listen-translation").ariaLabel="Listen to translation";el("listen-translation").title="Listen to translation";
  }
  function fitPanel(){
    host.style.left="auto";host.style.right="12px";host.style.top="12px";
  }
  function showSelection(embedded=null){
    if(answerPage!==location.href.split("#")[0]){answers.clear();answerPage=location.href.split("#")[0];}
    selectionLauncher?.hide();
    if(document.activeElement!==host)returnFocus=document.activeElement;
    hide();highlightRange=null;el("equation-note").textContent="";
    // Focus is not the selection: a search field can keep focus while a
    // result snippet elsewhere on the page has a valid text range.
    const selection=embedded?null:window.getSelection();
    paperSelection=embedded?embedded.text:String(selection||"");
    paperSourceUrl=embedded?embedded.sourceUrl:location.href;
    contextSelection=paperSelection.trim();
    selectedText=contextSelection;
    if(!selectedText||(!embedded&&!selection.rangeCount))return false;
    if(!embedded){const range=selection.getRangeAt(0),node=range.commonAncestorContainer,container=node?.nodeType===1?node:node?.parentElement;if(container?.isContentEditable||container?.closest?.("input, textarea"))return false;highlightRange=range.cloneRange?.()||null;}
    let anchor=null;try{anchor=globalThis.WordNotesAnchor?.capture(document,highlightRange)||null;}catch{}
    const entry=history?.remember({text:selectedText,paperSelection,sourceUrl:paperSourceUrl,range:highlightRange?.cloneRange?.()||null,anchor,embedded:!!embedded,action:selectedAction,provider:selectedProvider});
    if(entry&&!entry.results.size)for(const [key,result]of answers)if(key.endsWith(`|${selectedText}`))history.update(entry.id,result);
    el("history-note").hidden=true;return paintSelection(!!embedded,entry);
  }
  function paintSelection(embedded=false,entry=null){
    followupUI?.hide();
    const canHighlight=!!highlighter?.canHighlight(highlightRange);
    for(const button of el("highlight-colors").children||[])button.disabled=!canHighlight;
    el("remove-highlight").disabled=!canHighlight;updateHighlightColor();
    el("highlight-note").textContent=!highlighter?.supported?"Text highlighting is unavailable in this browser.":embedded?"Highlighting is unavailable for this embedded selection.":canHighlight?(highlighter.persistent?highlightStatus():"Highlighting is available until reload."):"Select non-editable webpage text to highlight.";
    el("word").textContent=selectedText;
    el("result").hidden=true;el("references-result").hidden=true;el("summary-result").hidden=true;el("translation-result").hidden=true;spokenTranslation=null;
    const saved=entry?.results.size?[...entry.results.values()]:[...answers.entries()].filter(([key])=>key.endsWith(`|${selectedText}`)).map(([,value])=>value);
    for(const result of saved)if((result.action!=="translate"||result.targetLanguage===settings.translationLanguage)&&(result.action!=="paper-explanation"||result.paperSourceUrl===paperSourceUrl))renderResult(result);
    const running=[...pending.entries()].find(([,job])=>entry?job.historyId===entry.id:job.text===selectedText);
    activeRequest=running?.[0]||null;
    setBusy(!!running);applyReadingMode();

    if(running){const view=resultView(running[1].action);view.section.hidden=false;view.section.className="result loading";view.status.textContent=running[1].stage||"Waiting for the answer…";if(running[1].partialText&&running[1].action!=="selection-references"){if(globalThis.WordRichResponse)WordRichResponse.render(view.answer,running[1].partialRich,running[1].partialText);else view.answer.textContent=running[1].partialText;}}
    updateHistoryControls();
    expandSection(selectedAction);
    host.style.display="block";
    minimized=false;el("selection-card").hidden=false;el("restore-selection").hidden=true;
    fitPanel();
    root.querySelector?.(".card")?.focus?.({preventScroll:true});
    if(entry?.results.size&&highlightRange){const active=resultView(selectedAction);if(!active.section.hidden)active.section.scrollIntoView?.({block:"nearest"});}
    return true;
  }
  function resultView(action){
    if(action==="selection-references")return {section:el("references-result"),status:el("references-status"),answer:el("references-answer")};
    if(action==="summarize")return {section:el("summary-result"),status:el("summary-status"),answer:el("summary-answer")};
    const translation=action==="translate";
    return {section:el(translation?"translation-result":"result"),status:el(translation?"translation-status":"status"),answer:el(translation?"translation-answer":"answer")};
  }
  function expandSection(action){
    el("references-result").open=action==="selection-references";
    el("summary-result").open=action==="summarize";el("result").open=action==="explain"||action==="paper-explanation";el("translation-result").open=action==="translate";
  }
  function renderResult(result){
    if(result.action==='explain'&&result.ok){const entry=history?.current(),key=answerKey(selectedText,'explain',settings.translationLanguage,result.provider);followupUI?.show({key:`${entry?.id||selectedText}|${result.provider}|${result.requestId||result.text}`,selection:selectedText,result,save:conversation=>{const updated={...result,conversation};history?.update(entry?.id,updated);answers.set(key,updated);}});}else if(result.action!=='translate'&&result.action!=='summarize'&&result.action!=='selection-references')followupUI?.hide();

    const view=resultView(result.action);
    view.section.hidden=false;view.section.className=result.ok?"result":"result error";
    view.status.textContent=result.ok?result.label:`${result.action==="translate"?"Translation":result.action==="summarize"?"Summary":result.action==="selection-references"?"Selection references":"AI explanation"} · Unable to finish`;
    if(result.warning)view.status.textContent+=" · "+result.warning;
    if(result.action==="selection-references"&&result.ok&&globalThis.WordSelectionReferences)WordSelectionReferences.render(view.answer,result.text);
    else if(globalThis.WordRichResponse&&result.ok&&result.action!=="translate")WordRichResponse.render(view.answer,result.rich,result.text);
    else {view.answer.textContent=result.ok?result.text:(result.error||"No answer received.");view.answer.classList?.remove("rich-response");}
    if(result.action==="translate"){
      stopTranslationSpeech();
      spokenTranslation=result.ok?{text:result.text,language:result.targetLanguage}:null;
      el("listen-translation").hidden=!spokenTranslation;el("speech-note").textContent="";
      if(spokenTranslation)applyTranslationSize();
    }
    fitPanel();
  }
  function complete(requestId,result){
    const job=pending.get(requestId);
    if(!job)return;
    clearTimeout(job.timer);pending.delete(requestId);
    result={...result,paperSourceUrl:job.paperSourceUrl,action:job.action,provider:job.provider,targetLanguage:job.targetLanguage,label:job.action==="selection-references"?"Selection references · ChatGPT":job.action==="translate"?`Google Translate · ${job.targetLanguage}`:job.action==="summarize"?`Summary · ${job.provider==="gemini"?"Gemini":"ChatGPT"}`:`${job.provider==="gemini"?"Gemini":"ChatGPT"} · explanation`};
    if(result.ok&&["explain","translate","paper-explanation"].includes(job.action))globalThis.WordReviewPanel?.record({pageUrl:job.pageUrl,text:job.text,action:job.action,
      provider:job.provider,language:job.targetLanguage,answer:result.text});
    history?.update(job.historyId,result);
    if(job.pageUrl===location.href.split("#")[0])answers.set(job.key,result);
    if(answers.size>20)answers.delete(answers.keys().next().value);
    if(activeRequest===requestId){
      activeRequest=null;setBusy(false);
      if(selectedText===job.text&&(!history||history.current()?.id===job.historyId))renderResult(result);
    }
  }
  chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
    if(sender.id!==chrome.runtime.id)return;
    if(message.type==="TRANSLATION_SPEECH_STATUS"&&message.speechId===speechId){
      if(message.state==="playing"){el("listen-translation").textContent="■";el("listen-translation").ariaLabel="Stop reading translation";el("listen-translation").title="Stop reading translation";el("speech-note").textContent="";}
      else {speechId=null;el("listen-translation").textContent="🔊";el("listen-translation").ariaLabel="Listen to translation";el("listen-translation").title="Listen to translation";el("speech-note").textContent=message.state==="error"?(message.error||"Unable to play audio."):"";}
      sendResponse({received:true});return;
    }
    if(message.type==="READ_PAGE_LOCATION"){sendResponse({ok:true,url:location.href,title:document.title});return;}
    if(message.type==="SHOW_SELECTION_MENU"){
      if(message.build&&message.build!==BUILD){sendResponse({ok:false,error:"Refresh this web page after updating Word Explainer."});return;}
      sendResponse({ok:true,shown:showSelection(),build:BUILD,courseFramesAllowed:typeof location!=="undefined"&&["www.skills.google","skills.google"].includes(location.hostname)});return;
    }
    if(message.type==="SHOW_COURSE_SELECTION_MENU"){
      let allowed=false;try{const url=new URL(message.selection?.sourceUrl);allowed=message.build===BUILD&&["www.skills.google","skills.google"].includes(location.hostname)&&url.origin==="https://storage.googleapis.com"&&url.pathname.startsWith("/cloud-training/")&&typeof message.selection.text==="string"&&message.selection.text.length<=8000&&["left","top","bottom"].every(key=>Number.isFinite(message.selection.rect?.[key]));}catch{}
      sendResponse({ok:allowed,shown:allowed?showSelection(message.selection):false,build:BUILD});return;
    }
    if(message.type==="EXPLANATION_RESULT"){
      complete(message.requestId,message);sendResponse({received:true});return;
    }
    const job=pending.get(message.requestId);
    if(!job)return;
    if(message.type==="EXPLANATION_PROGRESS"||message.type==="EXPLANATION_PARTIAL"){
      if(typeof message.text==="string"){job.partialText=message.text;job.partialRich=message.rich;}
      job.stage=job.action==="summarize"?`Summary · ${message.stage||"Receiving…"}`:message.stage;
      if(message.requestId===activeRequest&&selectedText===job.text){
        const view=resultView(job.action);view.status.textContent=job.stage;
        if(typeof message.text==="string"&&job.action!=="selection-references"){if(globalThis.WordRichResponse&&job.action!=="translate")WordRichResponse.render(view.answer,message.rich,message.text);else view.answer.textContent=message.text;fitPanel();}
      }
      sendResponse({received:true});
    }
  });
  document.addEventListener("mouseup",event=>{if(!event.composedPath().includes(host))minimizeSelection();});
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&!tooltip.hidden){event.preventDefault();hideTooltip();return;}
    if(event.key==="Escape"&&host.style.display==="block"&&!minimized){event.preventDefault();minimizeSelection(true);}
  });
  root.addEventListener("keydown",event=>{
    if(event.key!=="Tab"||minimized)return;
    const stops=[...root.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')].filter(node=>node.getClientRects().length);
    if(!stops.length)return;
    const current=root.activeElement;
    if(event.shiftKey&&(current===stops[0]||!stops.includes(current))){event.preventDefault();stops.at(-1).focus();}
    else if(!event.shiftKey&&current===stops.at(-1)){event.preventDefault();stops[0].focus();}
  });
  window.addEventListener("resize",fitPanel);
  root.addEventListener("mousedown",event=>{if(event.target.closest?.("button"))event.preventDefault();});
  // Do not let the host page's wheel handlers cancel native panel scrolling.
  // If a capture handler already cancelled it, move only the panel's scrollable area.
  root.addEventListener("wheel",event=>{
    if(event.ctrlKey||event.metaKey)return;
    event.stopPropagation();if(!event.defaultPrevented)return;
    for(const node of event.composedPath()){
      if(node?.nodeType!==1||!root.contains(node))continue;
      const style=getComputedStyle(node),factor=event.deltaMode===1?(parseFloat(style.lineHeight)||16):event.deltaMode===2?Math.max(1,node.clientHeight):1;
      let dx=event.deltaX*factor,dy=event.deltaY*factor;if(event.shiftKey&&!dx){dx=dy;dy=0;}
      const y=/auto|scroll/.test(style.overflowY)&&node.scrollHeight>node.clientHeight+1&&(dy<0?node.scrollTop>0:dy>0&&node.scrollTop+node.clientHeight<node.scrollHeight-1);
      const x=/auto|scroll/.test(style.overflowX)&&node.scrollWidth>node.clientWidth+1&&(dx<0?node.scrollLeft>0:dx>0&&node.scrollLeft+node.clientWidth<node.scrollWidth-1);
      if(y||x){if(y)node.scrollTop+=dy;if(x)node.scrollLeft+=dx;return;}
    }
  },{passive:false});
  root.addEventListener("keydown",event=>{
    const area=event.target.closest?.(".result-body");if(!area||event.ctrlKey||event.metaKey||event.altKey||!["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"].includes(event.key))return;
    if(event.target.closest?.("textarea,input"))return;
    event.stopPropagation();if(!event.defaultPrevented)return;
    const page=Math.max(40,area.clientHeight-30);if(event.key==="Home")area.scrollTop=0;else if(event.key==="End")area.scrollTop=area.scrollHeight;else area.scrollTop+=event.key==="ArrowDown"?40:event.key==="ArrowUp"?-40:event.key==="PageDown"?page:-page;
  });
  root.addEventListener("touchmove",event=>event.stopPropagation(),{passive:true});

  el("close").addEventListener("click",dismiss);
  el("open-settings").addEventListener("click",()=>send({type:"OPEN_SETTINGS"}).catch(()=>{}));
  el("listen-translation").addEventListener("click",()=>{
    if(speechId){stopTranslationSpeech();el("speech-note").textContent="";return;}
    if(!spokenTranslation)return;
    const languages={Urdu:"ur",English:"en",Arabic:"ar",French:"fr",Spanish:"es"};
    speechId=crypto.randomUUID?.()||String(Date.now());
    el("speech-note").textContent="Loading audio…";
    send({type:"SPEAK_TRANSLATION",text:spokenTranslation.text,language:languages[spokenTranslation.language]||"ur",
      rate:settings.rate,speechId}).then(ack=>{if(!ack?.accepted)throw new Error("Unable to start audio.");})
      .catch(error=>{speechId=null;el("speech-note").textContent=error.message;});
  });
  let equationUtterance=null;
  function stopEquationSpeech(){
    const previous=equationUtterance;equationUtterance=null;
    el("equation-speak").setAttribute("aria-pressed","false");
    if(previous&&typeof speechSynthesis!=="undefined")speechSynthesis.cancel();
  }
  el("equation-speak").addEventListener("click",()=>{
    if(equationUtterance){stopEquationSpeech();el("equation-note").textContent="Equation pronunciation stopped.";return;}
    const result=globalThis.WordEquationSpeech?.toSpeech(contextSelection||selectedText);
    if(!result?.ok){el("equation-note").textContent=result?.error||"Reload the extension and refresh this page to enable equation pronunciation.";fitPanel();return;}
    if(typeof speechSynthesis==="undefined"||typeof SpeechSynthesisUtterance==="undefined"){
      el("equation-note").textContent="Speech playback is not available in this browser.";fitPanel();return;
    }
    stopTranslationSpeech();speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(result.text);equationUtterance=utterance;
    utterance.lang="en-US";utterance.rate=settings.rate;
    const voices=typeof speechSynthesis.getVoices==="function"?speechSynthesis.getVoices():[];
    const english=voices.find(voice=>/^en(?:-|$)/i.test(voice.lang)&&voice.default)||voices.find(voice=>/^en(?:-|$)/i.test(voice.lang));
    if(english)utterance.voice=english;
    el("equation-speak").setAttribute("aria-pressed","true");
    el("equation-note").textContent="English reading: "+result.text;
    const finish=()=>{if(equationUtterance===utterance){equationUtterance=null;el("equation-speak").setAttribute("aria-pressed","false");}};
    utterance.onend=finish;
    utterance.onerror=event=>{if(equationUtterance!==utterance)return;finish();el("equation-note").textContent=["canceled","interrupted"].includes(event.error)?"Equation pronunciation stopped.":"Could not play the English voice. Check your device speech settings.";};
    try{speechSynthesis.speak(utterance);}catch{finish();el("equation-note").textContent="Speech playback could not start. Try again.";}
    fitPanel();
  });
  el("speak").addEventListener("click",()=>{
    speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(selectedText);
    utterance.lang=settings.language;utterance.rate=settings.rate;plainUtterance=utterance;
    const done=()=>{if(plainUtterance===utterance)plainUtterance=null;};utterance.onend=done;utterance.onerror=done;speechSynthesis.speak(utterance);
  });
  function requestAction(action,provider="chatgpt"){
    if(pronunciationAndTranslationOnly&&action!=="translate")return;
    if(action==="paper-explanation"&&globalThis.WordMathSelection&&!WordMathSelection.isMath(paperSelection||selectedText)){el("math-mode-note").hidden=false;el("math-mode-note").textContent="Select a mathematical equation first.";fitPanel();return;}
    el("llm-choices").hidden=true;el("ask-llm").setAttribute("aria-expanded","false");
    if(["summarize","selection-references"].includes(action)&&selectedText.length>8000){renderResult({action,ok:false,error:"Select up to 8,000 characters and try again."});expandSection(action);return;}
    if(action==="explain"||action==="paper-explanation")followupUI?.hide();
    selectedProvider=provider;
    selectedAction=action;
    const historyEntry=history?.current();if(historyEntry){historyEntry.action=action;historyEntry.provider=provider;}
    if(action==="translate"){stopTranslationSpeech();spokenTranslation=null;el("listen-translation").hidden=true;el("speech-note").textContent="";}
    const requestId=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    activeRequest=requestId;
    const job={historyId:historyEntry?.id,text:selectedText,action,provider,paperSourceUrl:action==="paper-explanation"?paperSourceUrl:undefined,pageUrl:typeof location!=="undefined"?location.href.split("#")[0]:"",targetLanguage:settings.translationLanguage,
      key:answerKey(selectedText,action,settings.translationLanguage),
      stage:action==="translate"?`Translating into ${settings.translationLanguage} with Google…`:`${action==="summarize"?"Summary · ":""}Opening ${provider==="gemini"?"Gemini":"ChatGPT"}…`,timer:null};
    pending.set(requestId,job);
    const view=resultView(action);view.section.hidden=false;view.section.className="result loading";
    view.status.textContent=job.stage;view.answer.textContent="";expandSection(action);
    setBusy(true);fitPanel();view.section.scrollIntoView?.({block:"nearest"});
    job.timer=setTimeout(()=>{
      complete(requestId,{ok:false,error:"The request timed out. Check the selected AI website and retry."});
      send({type:"CANCEL_EXPLANATION",requestId}).catch(()=>{});
    },155000);
    send({type:action==="selection-references"?"FIND_SELECTION_REFERENCES":action==="paper-explanation"?"EXPLAIN_PAPER_SELECTION":action==="translate"?"TRANSLATE_SELECTION":action==="summarize"?"SUMMARIZE_SELECTION":"EXPLAIN_SELECTION",text:action==="paper-explanation"?paperSelection:["summarize","selection-references"].includes(action)?selectedText:selectedText.slice(0,1000),sourceUrl:action==="paper-explanation"?paperSourceUrl:undefined,requestId,build:BUILD,action,provider,translationLanguage:job.targetLanguage}).then(ack=>{
      if(!ack?.accepted)complete(requestId,{ok:false,error:ack?.error||"The extension could not start the request."});
    }).catch(error=>complete(requestId,{ok:false,error:error.message||"Connection lost. Refresh this page."}));
  }
  el("cross-context").addEventListener("click",async()=>{
    if(pronunciationAndTranslationOnly)return;
    if(contextSelection.length>8000){el("cross-context").textContent="Select up to 8,000 characters";return;}
    const button=el("cross-context");button.disabled=true;
    try{const ack=await send({type:"OPEN_CONTEXTS",text:contextSelection,title:document.title});
      if(!ack?.ok)throw new Error(ack?.error||"Could not open contexts.");hide();
    }catch(error){button.textContent=error.message;}finally{button.disabled=false;}
  });
  el("ask-llm").addEventListener("click",()=>{
    if(pronunciationAndTranslationOnly)return;
    if(["chatgpt","gemini"].includes(settings.askProvider)){requestAction("explain",settings.askProvider);return;}
    const choices=el("llm-choices");choices.hidden=!choices.hidden;
    el("ask-llm").setAttribute("aria-expanded",String(!choices.hidden));fitPanel();if(!choices.hidden)choices.scrollIntoView?.({block:"nearest"});
  });
  el("paper-explanation").addEventListener("click",()=>requestAction("paper-explanation","chatgpt"));
  el("selection-references").addEventListener("click",()=>requestAction("selection-references","chatgpt"));
  el("summarize").addEventListener("click",()=>requestAction("summarize","chatgpt"));
  el("explain").addEventListener("click",()=>requestAction("explain"));
  el("gemini").addEventListener("click",()=>requestAction("explain","gemini"));
  el("translate").addEventListener("click",()=>requestAction("translate"));
  if(window.top===window){globalThis.WordReviewPanel?.useDock?.();globalThis.WordFloatingTools?.create({selectionAI:!pronunciationAndTranslationOnly,openSelection:action=>{if(!showSelection())return false;if(action)el(action)?.click();return true;},mountReview:(container,onClose)=>globalThis.WordReviewPanel?.mount?.(container,onClose)||false});}
  if(!pronunciationAndTranslationOnly)followupUI=globalThis.WordFollowup?.create({mount:el('answer').parentElement,request:({selection,...payload})=>send({type:'EXPLAIN_SELECTION',action:'explain',text:selection,build:BUILD,...payload})});
  const loadRevision=historyRevision;
  if(history)send({type:"LOAD_SELECTION_HISTORY"}).then(reply=>{
    if(historyRevision===loadRevision&&history?.restore(reply?.state)){updateHistoryControls();hide();}
  }).catch(()=>{});
  function checkHistoryPage(){if(answerPage!==location.href.split("#")[0]){answers.clear();history?.position();hide();answerPage=location.href.split("#")[0];}}
  window.addEventListener("popstate",checkHistoryPage);
  window.navigation?.addEventListener("currententrychange",checkHistoryPage);
  globalThis.WordSelectionUI={open:()=>showSelection(),clearHistory:clearSelectionHistory};
  selectionLauncher=globalThis.WordSelectionLauncher?.create({open:()=>showSelection(),isPanelOpen:()=>host.style.display==="block"&&!minimized});
})();
