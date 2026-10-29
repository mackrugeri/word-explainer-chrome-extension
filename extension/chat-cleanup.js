// Delete only the conversation created in the extension-owned worker tab.
(() => {
  const validPath = path => typeof path === 'string' && (location.hostname === 'gemini.google.com' ? /^\/app\/[a-zA-Z0-9-]+\/?$/ : /^\/c\/[a-zA-Z0-9-]+\/?$/).test(path);
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const shown = node => node && node.getClientRects().length > 0 && !node.disabled;
  async function waitFor(read, timeout = 2500) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) { const value = read(); if (value) return value; await pause(150); }
    return null;
  }
  async function remove(path, expectedPrompt) {
    if (!validPath(path) || location.pathname !== path || !['chatgpt.com','gemini.google.com'].includes(location.hostname))
      return { deleted: false, error: 'Conversation identity could not be verified.' };
    const gemini = location.hostname === 'gemini.google.com';
    const normalize = value => String(value || '').normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
    const userSelector = gemini ? 'user-query .query-text, user-query .query-content, user-query'
      : '[data-message-author-role="user"], [data-message-role="user"], [data-conversation-role="user"], [data-turn="user"], [data-content-search-unit-key$=":user"], .user-turn';
    const bodySelector = '.query-text, .query-content, .whitespace-pre-wrap, [data-message-text], [data-user-markdown], [data-markdown-text-style="user-message"], [data-content-search-unit-key$=":user"]';
    const matchesPrompt = () => [...document.querySelectorAll(userSelector)].some(node => {
      // New ChatGPT layouts put the role marker on the "You said" heading,
      // with the actual question inside its parent rather than the marker.
      const containers=[node];
      if(node.getAttribute?.('data-conversation-role')==='user' && node.parentElement)containers.push(node.parentElement);
      return containers.some(container=>{
        const candidates=[container,...(container.querySelectorAll?.(bodySelector)||[])];
        return candidates.some(body=>{
          const lines=gemini?[...(body.querySelectorAll?.('.query-text-line')||[])]:[];
          // Gemini duplicates the full question in an accessibility-only h5.
          // Match the complete visible paragraph sequence, excluding that heading.
          const text=lines.length?lines.map(line=>line.textContent||'').join('\n'):(body.innerText||body.textContent);
          return normalize(text)===normalize(expectedPrompt);
        });
      });
    });
    if (!expectedPrompt || !matchesPrompt()) return { deleted: false, error: 'The generated prompt could not be matched to this conversation.' };
    const rowMenu = () => {
      const anchor = [...document.querySelectorAll('a[href]')].find(node => {
        try { const url = new URL(node.href, location.href); return url.origin === location.origin && url.pathname === path && !url.hash; } catch { return false; }
      });
      if (!anchor) return null;
      let row = anchor.parentElement;
      for (let depth = 0; row && depth < 8; depth++, row = row.parentElement) {
        // Never use the whole sidebar: it could target another chat's menu.
        const anchors = [...row.querySelectorAll('a[href]')].filter(link => (gemini ? /\/app\/[a-zA-Z0-9-]+/ : /\/c\//).test(link.getAttribute('href') || ''));
        if (anchors.length > 1) return null;
        const menu = row.querySelector(gemini ? 'button[aria-label^="More options for "], button[data-test-id="conversation-actions-menu"]' : 'button[aria-label="Chat actions"], button[data-testid$="-options"]');
        if (menu && shown(menu)) return menu;
      }
      return null;
    };
    const menu = await waitFor(rowMenu);
    if (!menu) return { deleted: false, error: 'The generated chat was not found in Recents.' };
    if (location.pathname !== path) return { deleted: false, error: 'The conversation changed before cleanup.' };
    // Radix menus open on pointerdown, not HTMLElement.click(). Send the
    // pointer sequence before click so both Radix and Material menus work.
    menu.focus?.({preventScroll:true});
    const pointer = {bubbles:true,cancelable:true,pointerId:1,pointerType:'mouse',isPrimary:true,button:0,buttons:1};
    menu.dispatchEvent(new PointerEvent('pointerdown',pointer));
    menu.dispatchEvent(new PointerEvent('pointerup',{...pointer,buttons:0}));
    menu.click();
    const deleteLabel = node => {
      const label = node.getAttribute?.('aria-label');
      if (label) return label.trim();
      const textNode = gemini ? node.querySelector?.('.mat-mdc-menu-item-text') : null;
      return (textNode?.textContent || node.textContent || '').trim().replace(/^(?:delete|delete_outline)\s+(?=Delete)/, '');
    };
    const option = await waitFor(() => {
      const items = [...document.querySelectorAll('[role="menuitem"]')].filter(node => shown(node) && /^Delete(?: chat| conversation)?$/i.test(deleteLabel(node)));
      return items.length === 1 ? items[0] : null;
    });
    if (!option || location.pathname !== path) return { deleted: false, error: 'The specific chat delete action was unavailable.' };
    option.click();
    const dialog = await waitFor(() => [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].find(node => shown(node) && /delete.*(?:chat|conversation)/i.test(node.textContent)));
    if (!dialog || location.pathname !== path) return { deleted: false, error: 'Deletion could not be confirmed for this chat.' };
    const confirmations = [...dialog.querySelectorAll('button')].filter(node => shown(node) && /^Delete(?: chat| conversation)?$/i.test(deleteLabel(node)));
    if (confirmations.length !== 1) return { deleted: false, error: 'A unique delete confirmation was unavailable.' };
    confirmations[0].click();
    const deleted = await waitFor(() => location.pathname !== path && ![...document.querySelectorAll('a[href]')].some(node => {
      try { return new URL(node.href, location.href).pathname === path; } catch { return false; }
    }));
    return deleted ? { deleted: true } : { deleted: false, error: 'Chat deletion was not verified.' };
  }
  globalThis.WordChatCleanup = { remove, validPath };
})();
