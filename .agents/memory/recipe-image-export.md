---
name: Recipe image export
description: The stable approach for exporting the recipe modal without changing its visual styling
---

Use html2canvas directly on the live recipe-card element with no clone callback or export-only layout/style overrides. The recipe image should be a literal preview capture.

**Why:** A separately mounted clone can lose the modal’s CSS context, expand flex layout incorrectly, and produce an image that looks unlike the website. The user prefers literal preview fidelity over a separately cleaned-up card. Revoking the blob URL immediately after clicking the download can also make downloads unreliable.

**How to apply:** Capture the current modal viewport exactly as rendered, keep the close and Save Recipe controls in the image, and revoke the downloaded blob URL after a short delay.