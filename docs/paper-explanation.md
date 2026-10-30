# Explain equation with respect to research paper

Select equation/text on the paper’s webpage and click **Explain equation with respect to research paper**. For a selectable PDF, right-click the selection, choose **Word Explainer — PDF actions**, then click the same action in the side panel.

This explicit action sends the exact selection (up to 8,000 characters) and its source HTTP(S) URL directly to ChatGPT through the existing provider workflow. Embedded selections use their supplied source URL. PDF selections use the source supplied by Chrome’s menu; the extension does not extract the full PDF or script the native PDF viewer. Missing/local-only source URLs are refused.

The prompt asks ChatGPT to open/research the URL, explain the equation’s symbols and role in the paper, and cite supporting sections/pages. This does not enable or guarantee ChatGPT browsing. If access fails, the prompt asks ChatGPT to acknowledge that and request an upload or relevant context. A selected page may not actually be a research paper; ChatGPT must verify it. Links requiring authentication or inaccessible papers may need an upload.

Ask to LLM, Summarize, translations, and Equation Pronunciation retain their existing behavior. Build remains 0.4.4.
