---
name: html2canvas color compatibility
description: html2canvas can reject modern computed CSS color values during concentrate image export
---

When exporting a rendered UI with html2canvas, clone the source node and normalize computed `color(srgb …)` values to rgba before rasterizing; preserve live form values on the clone.

**Why:** Chromium can resolve Tailwind color-mix styles to `color(srgb …)`, which html2canvas does not parse and otherwise turns a working download into a silent “Try again” state.

**How to apply:** Keep the live node as the visual source, normalize only the export clone, and always remove the clone and reset saving state in `finally`.