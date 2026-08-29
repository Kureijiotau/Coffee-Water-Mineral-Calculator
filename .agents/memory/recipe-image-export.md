---
name: Recipe image export
description: The stable approach for exporting the recipe modal without changing its visual styling
---

Use html2canvas on the live recipe-card element and make export-only changes in its onclone callback. Do not manually append an off-screen clone to the document or copy computed styles into it.

**Why:** A separately mounted clone can lose the modal’s CSS context, expand flex layout incorrectly, and produce an image that looks unlike the website. Revoking the blob URL immediately after clicking the download can also make downloads unreliable.

**How to apply:** Remove only explicitly marked export UI from the html2canvas clone, expand the scroll container there, and revoke the downloaded blob URL after a short delay.