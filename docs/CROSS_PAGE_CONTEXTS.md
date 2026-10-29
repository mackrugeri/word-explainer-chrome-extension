# Cross-page contexts and connection map

Select text on a supported page, open the selection menu, and choose **Cross-page context**. In the separate workspace, creating a named context also saves the pending first excerpt atomically. For an existing context, use Add to this context. The toolbar popup also provides a way to reopen the workspace.

## Connection map

Each saved excerpt has a numbered card, source title, text preview, IN port, and OUT port. Drag a card by its header to arrange it. Drag OUT onto another card or its IN port to create a directed arrow. Alternatively click OUT, then IN; Escape cancels. Select an arrow and choose **Remove selected arrow** to remove it. The existing form supports relationship notes and remains available as an accessible alternative. Dragging an existing arrow to rewire it is not supported; remove it and draw a new arrow.

Card positions and links persist locally and are shared by workspaces opening the same named context. Different contexts have independent layouts. The canvas scrolls horizontally and vertically. A position change does not affect the context revision or invalidate its summary. Adding/removing an excerpt or a semantic link does invalidate an earlier summary.

## Modules

- `context-store.js`: serialized local mutations, named contexts, source snapshots, directed links, bounded card coordinates, source-grounded summary preparation and revision tracking.
- `context-controller.js`: trusted workspace message boundary, selection drafts, source validation, and job dispatch.
- `context-graph.js`: dependency-free pointer/keyboard interaction and SVG arrow rendering; delegates mutations to the workspace.
- `contexts.js`, `contexts.html`, `contexts.css`: separate research workspace, saved excerpts, graph, source citations, and ChatGPT/Gemini selection.

At most 20 contexts, 30 excerpts per context, and 100 explicit links per context are accepted. Each excerpt can contain up to 8,000 characters. Summary preparation refuses payloads above 28,000 characters rather than silently truncating source material. The summary uses a snapshot of source references; later content changes mark it outdated. Numeric references are checked for valid source numbers, which does not independently verify the factual quality of generated prose.

## Verification

Run `node scripts/test-extension.mjs` (includes `scripts/test-context-graph.mjs`). Tests cover moving/persisting cards, unchanged semantic revision during layout edits, invalid coordinates, removed-node cleanup, ten-card rendering, first-to-tenth drag linking, post-drag click suppression, keyboard connections, selecting/removing arrows, and refusal of self-connections. A sample-data browser fixture also verifies a real pointer drag, card movement, persistence after refresh, and arrow removal. Installed-extension testing still requires reload and reopening the workspace.

## Delete a context

Each item in Your contexts has a dustbin button. It opens a dialog requiring the exact context name, including case and whitespace. Both the UI and background storage service reject mismatches. Confirming deletes only that context and its excerpts, links, layout and saved summary; Cancel or Escape leaves it unchanged.
