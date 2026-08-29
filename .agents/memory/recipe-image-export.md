---
name: Recipe image export
description: The stable approach for exporting the recipe modal without changing its visual styling
---

Use a native SVG foreignObject snapshot of the live recipe-card element, embedding the current stylesheet text and rasterizing that SVG for download. Do not use html2canvas for the recipe card.

**Why:** html2canvas repaints the card and repeatedly produced distorted text, borders, and layout. A separately mounted HTML clone also lost the modal’s CSS context. The user prefers literal preview fidelity over a separately cleaned-up card. Revoking the blob URL immediately after clicking the download can also make downloads unreliable.

**How to apply:** Capture the current modal viewport at its rendered dimensions, keep the close and Save Recipe controls in the image, embed accessible same-origin stylesheets in the SVG, rasterize at 2×, and revoke both SVG and download blob URLs after use.