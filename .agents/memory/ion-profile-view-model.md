---
name: Ion profile view model
description: Ion Profile must distinguish the original salt recipe from the final mixture with configured base water.
---

The Watermancer Ion Profile shows the final configured-water mixture as its single visible calculation. Salt-only totals remain an internal chemistry baseline for recipe comparisons, gap calculations, and disclosures, but are not exposed as a user-facing toggle.

**Why:** Watermancer is focused on shaping source water, so showing one final-mixture profile avoids an obsolete presentation toggle while preserving the separate salt-only baseline needed by the chemistry engine.

**How to apply:** Keep the Ion Profile sourced from the shared adjusted-target/final-mixture calculation. Use the salt-only model only where calculations or explanatory disclosures explicitly require the original recipe baseline.