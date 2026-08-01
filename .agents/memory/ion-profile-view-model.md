---
name: Ion profile view model
description: Ion Profile must distinguish the original salt recipe from the final mixture with configured base water.
---

The Watermancer Ion Profile shows the final configured-water mixture as its single visible calculation. Salt-only totals remain an internal chemistry baseline for recipe comparisons, gap calculations, and disclosures, but are not exposed as a user-facing toggle.

**Why:** Watermancer is focused on shaping source water, so showing one final-mixture profile avoids an obsolete presentation toggle while preserving the separate salt-only baseline needed by the chemistry engine.

**How to apply:** Keep the Ion Profile sourced from the shared adjusted-target/final-mixture calculation. Use the salt-only model only where calculations or explanatory disclosures explicitly require the original recipe baseline.

The sticky Watermancer ion bars are a separate progress view: once base-water volume is nonzero, show mineral base-water ions plus only salts marked Used against the selected Watermancer target profile. Do not include addition water or automatically suggested salts in this view.

**Why:** The user needs a persistent readout of how the selected base water and explicit salt choices are closing the active profile, without conflating that decision surface with the broader final-batch chemistry summary.

**How to apply:** Keep this bar view Watermancer-only, sticky near the profile, and render zero-target ions as diagnostic overshoots rather than normal progress toward a target.