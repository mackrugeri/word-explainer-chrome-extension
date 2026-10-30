(() => {
  // Paint ranges without wrapping or rewriting the site's DOM.
  const colors = [
    ['green', 'Forest', '#16654f'], ['yellow', 'Amber', '#8a5900'],
    ['orange', 'Burnt orange', '#a8440c'], ['pink', 'Berry', '#a82b67'],
    ['purple', 'Violet', '#713eb5'], ['blue', 'Sapphire', '#245eb4'],
    ['cyan', 'Ocean', '#076b7c'], ['gray', 'Slate', '#485665'],
    ['red', 'Ruby', '#b3323c'], ['teal', 'Teal', '#087365']
  ];
  function create(doc = document, registry = globalThis.CSS?.highlights, HighlightType = globalThis.Highlight) {
    const supported = !!registry && typeof HighlightType === 'function';
    const entries = [];
    let style;
    const name = key => `word-explainer-${key}`;
    function valid(range) {
      if (!supported || !range || range.collapsed) return false;
      const node = range.commonAncestorContainer;
      const element = node?.nodeType === 1 ? node : node?.parentElement;
      return !!node?.isConnected && node.ownerDocument === doc &&
        !element?.closest?.('input,textarea,[contenteditable]:not([contenteditable="false"])');
    }
    function paint() {
      if (!style?.isConnected) {
        style = doc.createElement('style');
        style.textContent = colors.map(([key,,color]) =>
          `::highlight(${name(key)}) { background-color:${color};color:#ffffff; }`).join('\n');
        doc.documentElement.appendChild(style);
      }
      for (let i = entries.length - 1; i >= 0; i--) if (!valid(entries[i].range)) entries.splice(i, 1);
      for (const [key] of colors) {
        const ranges = entries.filter(entry => entry.color === key).map(entry => entry.range);
        if (ranges.length) registry.set(name(key), new HighlightType(...ranges));
        else registry.delete(name(key));
      }
    }
    function remove(range) {
      if (!valid(range)) return false;
      // Removing or recoloring a selection clears whole highlights it overlaps.
      for (let i = entries.length - 1; i >= 0; i--) {
        const saved = entries[i].range;
        if (!valid(saved) || (range.compareBoundaryPoints(1, saved) > 0 && range.compareBoundaryPoints(3, saved) < 0)) entries.splice(i, 1);
      }
      paint();
      return true;
    }
    function apply(range, color) {
      if (!colors.some(([key]) => key === color) || !valid(range)) return false;
      remove(range);
      entries.push({range: range.cloneRange(), color});
      paint();
      return true;
    }
    function activeColor(range) {
      if (!valid(range)) return null;
      const overlapping = entries.filter(entry => valid(entry.range) &&
        range.compareBoundaryPoints(1, entry.range) > 0 && range.compareBoundaryPoints(3, entry.range) < 0);
      const keys = new Set(overlapping.map(entry => entry.color));
      return keys.size === 1 ? overlapping[0].color : null;
    }
    function replace(items) {
      entries.splice(0, entries.length, ...items.filter(item => valid(item.range)));
      if (supported) paint();
    }
    return {supported, canHighlight: valid, apply, remove, activeColor, replace};
  }
  // One bounded record per page. Updates merge under a same-origin Web Lock,
  // so two tabs recoloring different passages do not overwrite each other.
  function createPersistent(options = {}) {
    const doc = options.document || document;
    const core = create(doc);
    const storage = options.storage || globalThis.chrome?.storage?.local;
    const anchors = options.anchors || globalThis.WordNotesAnchor;
    if (!storage?.get || !storage?.set || !anchors) return core;
    const prefix = 'wordHighlightsV1:';
    const page = () => { const u = new URL(options.url ? options.url() : doc.location.href); u.hash = ''; return u.href; };
    let url = page(), records = [], queue = Promise.resolve(), epoch = 0, disposed = false, readError = false;
    const key = value => prefix + value;
    const clean = value => Array.isArray(value?.items) ? value.items.slice(0, 80).filter(item =>
      typeof item?.id === 'string' && colors.some(([color]) => color === item.color) &&
      typeof item.anchor?.exact === 'string' && item.anchor.exact.length > 0 && item.anchor.exact.length <= 8000 &&
      typeof item.anchor.prefix === 'string' && item.anchor.prefix.length <= 80 &&
      typeof item.anchor.suffix === 'string' && item.anchor.suffix.length <= 80) : [];
    const read = async value => clean((await storage.get(key(value)))[key(value)]);
    function render() {
      if (disposed) return;
      const items = records.map(item => ({color:item.color, range:anchors.resolve(doc,item.anchor)}));
      core.replace(items.filter(item => item.range));
    }
    async function load() {
      const target = page(), token = ++epoch;
      if (target !== url) { url = target; records = []; core.replace([]); }
      let items;
      try { items = await read(target); readError = false; } catch(error) { readError = true; throw error; }
      if (!disposed && token === epoch && target === page()) { records = items; render(); }
    }
    const ready = load(); ready.catch(() => {});
    const overlap = (a,b) => a && b && a.compareBoundaryPoints(1,b) > 0 && a.compareBoundaryPoints(3,b) < 0;
    function mutate(range,color) {
      // Capture the page and quote before awaiting storage or the lock.
      const target = page();
      if (!core.canHighlight(range) || (color && !colors.some(([id]) => id === color))) return Promise.resolve(false);
      const anchor = anchors.capture(doc,range);
      if (!anchor) return Promise.reject(Error('This passage cannot be identified uniquely. Select a shorter passage with surrounding context.'));
      const selection = range.cloneRange();
      const run = async () => {
        if (target !== page()) throw Error('The page changed. Select the passage again.');
        const current = await read(target);
        if (target !== page() || !core.canHighlight(selection)) throw Error('The page changed. Select the passage again.');
        const items = current.filter(item => !overlap(selection,anchors.resolve(doc,item.anchor)) && JSON.stringify(item.anchor) !== JSON.stringify(anchor));
        if (color) items.push({id:globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, color, anchor});
        if (items.length > 80 || new TextEncoder().encode(JSON.stringify(items)).length > 64000) throw Error('This page’s highlight storage is full. Remove some highlights first.');
        const storageKey = key(target);
        if (color && !current.length) {
          const keys = storage.getKeys ? await storage.getKeys() : Object.keys(await storage.get(null));
          if (!keys.includes(storageKey) && keys.filter(value => value.startsWith(prefix)).length >= 100)
            throw Error('Highlight storage is full (100 pages). Remove highlights from another page first.');
        }
        if (target !== page()) throw Error('The page changed. Select the passage again.');
        if (!items.length && storage.remove) await storage.remove(storageKey);
        else await storage.set({[storageKey]:{version:1,items}});
        if (target === page() && !disposed) { ++epoch; readError = false; url = target; records = items; render(); }
        return true;
      };
      const task = queue.catch(() => {}).then(() => {
        const locks = options.locks || doc.defaultView?.navigator?.locks;
        return locks ? locks.request(key(target),run) : run();
      });
      queue = task; return task;
    }
    let timer, firstPending = 0;
    const observer = new MutationObserver(() => {
      if (!records.length || disposed) return;
      clearTimeout(timer); firstPending ||= Date.now();
      timer = setTimeout(() => { firstPending = 0; render(); }, Date.now()-firstPending > 2000 ? 0 : 250);
    });
    if (doc.body) observer.observe(doc.body,{childList:true,subtree:true,characterData:true});
    const interval = setInterval(() => {
      if (page() !== url) { ++epoch; url = page(); records = []; core.replace([]); load().catch(() => {}); }
    },500);
    function changed(changes,area) { if (area === 'local' && changes[key(page())]) load().catch(() => {}); }
    globalThis.chrome?.storage?.onChanged?.addListener(changed);
    function status() {
      if (readError) return "Could not load saved highlights. Refresh this page to retry.";
      const missing = records.filter(item => !anchors.resolve(doc,item.anchor)).length;
      return missing ? `${missing} saved highlight${missing===1?'':'s'} awaiting a matching passage.` : 'Saved locally · restored when this page reopens.';
    }
    return {...core, persistent:true, ready, apply:(range,color)=>mutate(range,color), remove:range=>mutate(range,null), status,
      dispose(){disposed=true;clearInterval(interval);clearTimeout(timer);observer.disconnect();globalThis.chrome?.storage?.onChanged?.removeListener?.(changed);}
    };
  }
  globalThis.WordHighlighter = {colors, create, createPersistent};
})();
