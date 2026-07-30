---
name: Base water final mixture
description: Keep base salt recipe metrics separate from final configured-water mixture metrics.
---

The calculator should present two distinct models: the base recipe uses the original salt targets only; the final mixture uses configured base/addition water plus suggested salt targets, with water occupying part of the final batch and RO/distilled water supplying the remainder.

**Why:** Adding mineral-water TDS on top of the full salt recipe overstated the result and did not represent what the user actually mixes.

**How to apply:** Keep GH, KH, and TDS cards for the original salt recipe unchanged. Only the separate final-mixture cards, recipe steps, and final-water warnings should use adjusted salts plus diluted configured-water ions.

The suggested magnesium-source control has three modes: Original recipe, Chlorides preferred, and Sulfates preferred. Original preserves the recipe's magnesium-salt split after water coverage; preference modes bias toward the selected source without discarding the other original form when both were present.

**Why:** Recipes may intentionally use both magnesium salts, so an exclusive one-salt swap changes the recipe more than necessary.

**How to apply:** Treat the preference as a soft allocation choice, not a sort-only toggle or an exclusive replacement. Keep the selected row hydration forms for displayed weighing amounts.