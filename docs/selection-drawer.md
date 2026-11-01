# Selection drawer and page-tools launcher

Selection tools open in a narrow right-edge drawer. The header’s Minimize control or Escape collapses it into a small edge tab. Click the tab to restore the same selection and results; restoration never starts a new AI request. Running answers finish and remain available while minimized. Clicking the page minimizes the drawer; scrolling and resizing leave it usable. Close dismisses the drawer and tab and stops its own speech.

The page-tools W launcher remains partly tucked above the viewport and faint while idle. Hover or keyboard focus reveals the complete button; only a click opens the tools below it. Touch devices retain a larger visible target, and reduced-motion preferences disable the reveal transition. These changes use CSS and the existing dock timer; no new polling or observers were added.

Verified with the extension suite and real Chrome fixtures covering right-edge position, minimize/restore with an in-flight result, no duplicate request, keyboard focus/Escape, small screens, W hover/focus/idle, Review, references, selection activation and Google Skills frame tools.
