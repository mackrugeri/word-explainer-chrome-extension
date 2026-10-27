# Verification

Run `python3 scripts/check.py` from the project root. This checks Python syntax, validates referenced manifest files, runs backend tests, and checks JavaScript syntax if Node.js is installed.

Manual Chrome checks:

- Load `extension/` unpacked and refresh an ordinary web page.
- Select a word with the mouse; confirm the toolbar appears.
- Select using the keyboard and release Shift; confirm actions appear.
- Click Pronounce and verify audible speech.
- Click Explain and verify the ChatGPT prompt includes selected text.
- Repeat through the right-click selection menu.
- Open the popup, choose Settings, save a language, speed, and detail level; verify changes.
- Disable the toolbar; confirm the right-click menu remains available.
- Verify the toolbar stays hidden in password fields and editable text.
- Confirm Escape and scrolling dismiss the toolbar.
- Check protected Chrome pages separately; content script actions are unavailable there.

Voice availability and ChatGPT prompt prefill must be verified in the target browser. Backend transport tests use in-memory HTTP streams so they can run without permission to bind a port.
