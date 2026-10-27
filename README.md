# Word Explainer

Chrome extension skeleton with a Python backend. Select a word or phrase on a web page to show **Pronounce** and **Explain in ChatGPT** actions. The same actions are available in Chrome's right-click menu.

## Structure

- `extension/`: Chrome Manifest V3 extension (JavaScript, HTML, CSS).
- `backend/app/`: optional Python HTTP API scaffold, using the standard library.
- `backend/tests/`: place future backend tests here.

Chrome requires JavaScript for extension behavior; Python runs separately as a backend.

## Load the extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this project's `extension` folder.
4. Refresh an ordinary web page, select text, and use the floating actions or right-click menu.

Chrome internal pages and other protected pages do not allow content scripts. Pronunciation uses your browser's available English speech voices. Selected text is capped at 1,000 characters.

## ChatGPT behavior

**Explain in ChatGPT** opens `https://chatgpt.com/` with a URL-encoded explanation prompt. Sign in to ChatGPT in that browser as needed. Depending on ChatGPT's interface, you may need to submit the prompt. This creates an entry point for an explanation; it does not read existing conversations, cookies, session tokens, or account data. Selected text is sent to ChatGPT in the URL only when you click that action. Do not use it for sensitive text.

## Run the optional Python scaffold

Python 3.10+; no third-party packages required:

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
python3 -m app.main
```

Health endpoint: `http://127.0.0.1:8000/health`.

The extension works without the Python service. The service is a starting point for future dictionary, history, or explanation features; no AI API integration is configured. Keep any future API credentials in the backend, never in extension code. Add authentication, explicit extension-origin permissions, and input validation before connecting browser requests to the backend.

## Next steps

- Add language and voice preferences.
- Add a dictionary or an authenticated AI provider behind the Python API.
- Add automated browser tests and packaged extension icons.

## Development commands

From this project's root:

```sh
python3 scripts/check.py
python3 scripts/package.py
```

The package command produces `dist/word-explainer-extension.zip`, containing only extension files. Load the unpacked directory during development; the ZIP is for distribution. Store publication still needs icons, listing assets, privacy disclosures, and Chrome Web Store review.

Open the extension popup and choose **Settings** to configure pronunciation language, speed, explanation detail, and the highlight toolbar. Preferences are saved locally.

## Python API example

```sh
curl -X POST http://127.0.0.1:8000/api/v1/explanations \
  -H 'Content-Type: application/json' \
  -d '{"text":"borrower","detail":"short"}'
```

This returns a prepared prompt and ChatGPT URL. See [API documentation](docs/API.md), [architecture](docs/ARCHITECTURE.md), and [testing checklist](docs/TESTING.md).

The included CI workflow assumes `word-explainer` is used as the repository root. If retaining it inside a parent repository, move the workflow to the repository's `.github/workflows/` folder and set its run step's working directory to `word-explainer`.
