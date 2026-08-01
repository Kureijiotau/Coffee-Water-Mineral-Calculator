---
name: Water auto-fill constraints
description: Auto-fill must mix source waters under all recipe-ion ceilings rather than greedily filling one source at a time.
---

Water auto-fill uses selected source waters as interchangeable inputs and ranks them lexicographically by highest calcium, magnesium, sodium, potassium, chloride, sulfate, citrates, then bicarbonate. Bicarbonate may exceed its target by up to 1 ppm to improve higher-priority mineral contributions; calcium, magnesium, and sodium remain ceilings. Lower-priority coupled ions are diagnostic overshoots, not auto-fill constraints.

**Why:** The desired water mix should cover GH minerals and useful cations before optimizing lower-impact coupled ions. Treating every ion as an equal hard ceiling prevents useful mineral coverage, while ignoring bicarbonate entirely creates excessive KH and masks the actual tradeoff.

**How to apply:** Keep base and addition water groups coupled during auto-fill, account for volumes already assigned in the other group, cap each source at 2,000 mL and the remaining batch volume, and leave the rest to RO/distilled water. The active preset/custom order and whole-ppm deviation are persisted locally and must be passed into both base- and addition-water auto-fill actions.