---
name: Water auto-fill constraints
description: Auto-fill must mix source waters under all recipe-ion ceilings rather than greedily filling one source at a time.
---

Water auto-fill uses selected source waters as interchangeable inputs and applies a priority order: lowest bicarbonate first, then highest calcium, magnesium, and sodium. Bicarbonate may exceed its target by up to 1 ppm to improve those mineral contributions; calcium, magnesium, and sodium remain ceilings. Chloride and sulfate are diagnostic coupled-ion overshoots, not auto-fill constraints.

**Why:** Most source waters hit the bicarbonate wall before the desired GH minerals. Treating every ion as an equal hard ceiling prevents useful mineral coverage, while ignoring bicarbonate creates excessive KH and masks the actual tradeoff.

**How to apply:** Keep base and addition water groups coupled during auto-fill, account for volumes already assigned in the other group, cap each source at 2,000 mL and the remaining batch volume, and leave the rest to RO/distilled water.