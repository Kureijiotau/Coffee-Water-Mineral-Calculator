---
name: Recipe image export
description: The stable approach for exporting the recipe modal without changing its visual styling
---

Use html-to-image's browser-native toJpeg renderer directly on the live recipe-card element. Do not use html2canvas or a manually mounted/off-screen clone for the recipe card.

**Why:** html2canvas and manually constructed SVG captures repeatedly produced distorted text, borders, or layout. The user prefers literal preview fidelity over a separately cleaned-up card. Revoking a blob URL immediately after clicking the download can also make downloads unreliable.

**How to apply:** Call toJpeg on the current modal viewport with cache busting and a 2× pixel ratio, keep the close and Save Recipe controls in the image, and download the returned data URL.