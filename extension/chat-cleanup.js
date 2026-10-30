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
    const deleteLabel = node => {
      let label = node.getAttribute?.('aria-label');
      if (!label) {
        const textNode = gemini ? node.querySelector?.('.mat-mdc-menu-item-text') : null;
        const copy = (textNode || node).cloneNode?.(true);
        // Shortcut hints and decorative icons are not part of the action name.
        if (copy) for (const hint of copy.querySelectorAll('kbd, svg, [aria-hidden="true"], [data-slot="shortcut"], .shortcut, .text-token-text-tertiary')) hint.remove();
        label = copy?.textContent || textNode?.textContent || node.textContent || '';
      }
      return normalize(label).replace(/^(?:delete|delete_outline)\s+(?=Delete)/, '')
        .replace(/\s*[⌘⌥⇧⌃⌫⌦].*$/u, '').trim();
    };
    const visibleMenus = () => [...document.querySelectorAll('[role="menu"], [data-radix-menu-content]')].filter(shown);
    // Never act on a menu that was already open for some other row.
    if (visibleMenus().length && menu.getAttribute?.('aria-expanded') !== 'true')
      return { deleted: false, error: 'Another menu was already open. Close it and retry cleanup.' };
    const findDelete = () => {
      const menus = visibleMenus();
      const candidates = menus.length
        ? menus.flatMap(node => [...node.querySelectorAll('[role="menuitem"], button')])
        : [...document.querySelectorAll('[role="menuitem"]')];
      const actions = new Map();
      for (const node of candidates) {
        if (!shown(node) || !/^Delete(?: chat| conversation)?$/i.test(deleteLabel(node))) continue;
        // New layouts wrap a button in a menuitem. Those are one action,
        // not two ambiguous Delete actions. Distinct menuitems stay distinct.
        const owner = node.closest?.('[role="menuitem"]') || node;
        if (!actions.has(owner) || node.tagName === 'BUTTON') actions.set(owner, node);
      }
      // A role=menuitem can itself contain another role=menuitem. closest()
      // returns each node itself, so merge containment chains as one action.
      // Sibling Delete items remain ambiguous and must never be guessed at.
      const entries = [...actions.entries()];
      const leaves = entries.filter(([owner]) => !entries.some(([other]) =>
        owner !== other && owner.contains?.(other)));
      return leaves.length === 1 ? leaves[0][1] : null;
    };
    menu.focus?.({preventScroll:true});
    let option = null;
    if (menu.getAttribute?.('aria-expanded') === 'true') option = await waitFor(findDelete, 1000);
    else {
      // Some menus open on pointerdown; an additional click can immediately
      // toggle them closed. Only try click if pointerdown did not open a menu.
      const pointer = {bubbles:true,cancelable:true,pointerId:1,pointerType:'mouse',isPrimary:true,button:0,buttons:1};
      menu.dispatchEvent(new PointerEvent('pointerdown',pointer));
      menu.dispatchEvent(new PointerEvent('pointerup',{...pointer,buttons:0}));
      option = await waitFor(findDelete, 700);
      if (!option && menu.getAttribute?.('aria-expanded') !== 'true' && !visibleMenus().length) {
        if (location.pathname !== path) return { deleted: false, error: 'The conversation changed before cleanup.' };
        menu.click(); option = await waitFor(findDelete);
      }
    }
    if (location.pathname !== path) return { deleted: false, error: 'The conversation changed before choosing Delete.' };
    if (!option) {
      const menus=visibleMenus();
      const opened=menus.length>0||menu.getAttribute?.('aria-expanded')==='true';
      const actions=[...new Set((menus.length?menus.flatMap(node=>[...node.querySelectorAll('[role="menuitem"], button')]):[...document.querySelectorAll('[role="menuitem"]')]).filter(shown).map(deleteLabel).filter(Boolean))].slice(0,8).map(label=>label.slice(0,45));
      return { deleted: false, error: opened
        ? 'The chat menu opened, but no unique Delete action was found. Visible actions: '+(actions.join(', ')||'none')+'.'
        : 'The chat actions menu did not open after pointer and click attempts.' };
    }
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
