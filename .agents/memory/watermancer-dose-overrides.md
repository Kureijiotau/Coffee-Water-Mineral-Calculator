---
name: Watermancer dose overrides
description: How the unified salt Dose control interacts with automatic matching
---

Watermancer shows one Dose control per salt: the solver supplies the initial suggestion, while editing the value creates a fixed dose override that the optimizer must not re-add or silently replace. A fixed zero is intentional.

**Why:** Users need to experiment above or below the calculated dose while still letting Watermancer optimize the other selected salts.

**How to apply:** Keep Dose and Use separate; convert edited physical mg to fixed ppm in the plan, exclude fixed salts from automatic solving, and use the resulting route for review and ion totals.

For the salt table, keep the visible dose controls together while rendering Suggested/Adjusted status directly beneath the numeric dose field.

**Why:** Auxiliary labels have different widths and otherwise shift the − / value / mg / + controls away from the column center; the status is most legible when tied to the number it describes.

**How to apply:** Wrap the numeric input and status in their own centered vertical stack, keep − / mg / + beside that stack, and preserve the four-column table grid.