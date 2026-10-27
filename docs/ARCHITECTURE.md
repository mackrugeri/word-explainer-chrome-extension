# Architecture

1. A content script reads selected text on ordinary web pages, ignoring input fields and editable content.
2. A shadow-root toolbar offers pronunciation and explanation actions.
3. Speech synthesis runs on the page using the selected language and speed.
4. The service worker constructs a ChatGPT prompt and opens a tab after an explicit explanation click.
5. Extension preferences stay in local Chrome storage.
6. The optional Python service exposes health and prompt-preparation endpoints. The extension does not call it yet.

## Backend boundaries

- `app/config.py`: environment configuration and limits.
- `app/services.py`: validated prompt preparation, ready for an additional provider service.
- `app/main.py`: HTTP transport and lifecycle.
- `tests/`: service and HTTP contract tests.

No conversation access, AI-generated response, history persistence, or external provider is implemented. A future provider integration should use server-side credentials and a separately authenticated endpoint. The development server binds to loopback and intentionally provides no cross-origin access headers. It is not a production server.
