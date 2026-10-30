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
    return {supported, canHighlight: valid, apply, remove, activeColor};
  }
  globalThis.WordHighlighter = {colors, create};
})();
