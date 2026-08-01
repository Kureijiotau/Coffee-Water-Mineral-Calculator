---
name: Water auto-fill constraints
description: Auto-fill must mix source waters under all recipe-ion ceilings rather than greedily filling one source at a time.
---

Water auto-fill uses selected source waters as interchangeable inputs and ranks them lexicographically by highest calcium, magnesium, sodium, potassium, chloride, sulfate, citrates, then bicarbonate. With a selected salt recipe, bicarbonate and the GH mineral priorities remain the protected ceilings while lower-priority coupled ions remain diagnostic. With no recipe selected, the active ion profile's green/safe ceiling is the target for every displayed ion, with no deviation allowed. Coverage bars use the same target map.

**Why:** Recipe mode should preserve its existing useful-mineral prioritization, while the no-recipe experience needs a meaningful profile-based target instead of comparing water against zero salt targets. Keeping Auto-fill and coverage bars on one target map prevents contradictory guidance.

**How to apply:** Keep base and addition water groups coupled during auto-fill, account for volumes already assigned in the other group, cap each source at 2,000 mL and the remaining batch volume, and leave the rest to RO/distilled water. The active preset/custom order and whole-ppm deviation are persisted locally and must be passed into both base- and addition-water auto-fill actions.