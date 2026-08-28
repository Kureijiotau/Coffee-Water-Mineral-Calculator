---
name: Gemini recipe image reading
description: Multimodal recipe screenshots need a dedicated recipe-analysis prompt rather than the label scanner
---

For recipe-card screenshots, send the original image directly to Gemini with a recipe-specific prompt that asks it to extract water volumes, every salt dose, and the final mineral analysis before suggesting changes. Do not route these images through the bottled-water label extractor.

**Why:** The label extractor only requests ion concentrations and can stall on a tall recipe screenshot, while a direct multimodal request can read the complete recipe and make a bounded adjustment.

**How to apply:** Preserve the image as image/png when possible, ask for structured JSON, and require Gemini to change as little as possible when the user requests a subtle recipe adjustment.