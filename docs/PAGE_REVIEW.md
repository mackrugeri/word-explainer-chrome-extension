# Page review

The independent **Review** badge stays at the top-right of supported web pages after the selection popup closes. It never opens automatically. Opening it displays short revision excerpts from completed translation and AI answers, grouped by selected text. These are the first two sentences (up to 240 characters), not a newly generated AI synthesis. Listening alone does not create an explanation.

## Modules

- `review-store.js`: background-owned local persistence, serialized mutations, URL normalization, deduplication, excerpt creation, and retention limits.
- `review-panel.js`: independent shadow-root badge and scrollable recap panel, page-navigation lifecycle, explicit open/close, and clear-page action.
- `content.js`: records successful completed answers with their originating page URL; failures and partial answers are not recorded.
- `background.js`: validates the sender's current HTTP(S) URL against the requested page before accessing the review service. No new permissions, AI calls, or tabs are needed.

Review uses the exact page URL without its fragment; paths and query strings remain distinct. Tabs viewing the same URL share that page's record. Different URLs stay separate. SPA URL changes reset the visible badge; late responses from the previous page are discarded. Records survive refresh through `chrome.storage.local` and stay on the device.

The most recently updated 20 pages and 40 concepts per page are retained, with at most eight provider/language notes per concept. Repeated answers from the same provider update their note. **Clear page** removes only the current page's recap. All saved text is rendered with `textContent`.

## Verification

Run `node scripts/test-extension.mjs`. Regression coverage includes serialized writes, page separation, reload persistence, provider deduplication, English/Urdu sentence extraction, retention bounds, clear-page isolation, inactive badge updates, safe text rendering, and SPA navigation. The visual fixture uses sample answers; installed-extension testing still requires reloading the extension and refreshing the source page.
