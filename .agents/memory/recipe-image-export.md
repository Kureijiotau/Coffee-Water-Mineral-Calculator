---
name: Recipe image export
description: The stable approach for exporting a deterministic recipe share card without capturing modal layout
---

Export the recipe as a dedicated, content-only SVG share card with a fixed width and content-driven height, then rasterize that SVG in the browser at a high pixel ratio. Keep the interactive recipe modal separate.

**Why:** The modal is optimized for interaction and scrolling, so DOM screenshot approaches vary with viewport and scroll state and can capture controls that do not belong in a share image.

**How to apply:** Build a serializable recipe view model first, wrap every variable-length label before laying out SVG panels, rasterize to PNG/JPG with a canvas, and always reset the saving state in a finally block. Keep editable WATER/JSON exports independent, but allow the PNG’s Watermancer-Recipe JSON to carry a profile snapshot for profile-aware import from either Alchemist or Watermancer; keep that snapshot out of the visible recipe card.