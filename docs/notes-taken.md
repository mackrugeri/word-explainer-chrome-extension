# Notes Taken

Select normal webpage text, open the Word Explainer popup, and click **Notes Taken**. Write a personal note and save. The editor counts whitespace-separated words in English or Urdu and accepts up to 100 words (12,000 characters). A floating pencil button beside the passage opens the note for editing or deletion. No page text is wrapped or rewritten.

Notes persist in chrome.storage.local, separately from AI recaps, with at most 400 notes across all sites. Saving beyond that limit evicts the oldest note. Notes stay on this device and are never sent to AI services. Full personal notes appear under the selected passage in the same site's Review and exported PDF. **Clear AI recap** preserves personal notes; delete a personal note in its editor.

Anchors retain the exact selected quote and up to 80 characters before and after. Restoration requires one unique exact match with both contexts. Ambiguous or changed passages produce a **notes · passage unavailable** button instead of a guessed icon. Click repeatedly to cycle through unavailable notes. Layout changes and inserted earlier text are supported; edited surrounding text may intentionally require the missing-passage fallback. Page URLs include query strings and exclude fragments.

Embedded cross-origin selections and Chrome's native PDF viewer cannot host these icons. Notes Taken currently supports normal webpage text only. Existing PDF actions and CSS Highlights remain separate.

Validation: test-notes.mjs covers restart persistence, word limits, site/page isolation, bounded storage, edits/deletion, Review merging and ambiguous/changed quote matching. test-notes-browser.cjs uses Playwright with Chrome to verify cross-element anchoring, Urdu editing, icons, unchanged page markup, DOM changes and fallback. Provider tests remain mocked and do not certify live ChatGPT/Gemini service behavior.
