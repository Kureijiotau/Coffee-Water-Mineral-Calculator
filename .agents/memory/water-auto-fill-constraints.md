---
name: Water auto-fill constraints
description: Auto-fill must mix source waters under all recipe-ion ceilings rather than greedily filling one source at a time.
---

Water auto-fill treats each selected source volume as a variable and maximizes useful target coverage subject to the batch-volume limit, per-source cap, non-negative volumes, and every modeled ion staying at or below its recipe target. Zero-target ions are hard ceilings too.

**Why:** A greedy allocator could satisfy one ion and then add another water that pushed several already-covered ions above target. Mineral waters are interchangeable means to a final composition, not required fixed quantities.

**How to apply:** Keep base and addition water groups coupled during auto-fill, account for volumes already assigned in the other group, and leave the remainder of the batch to RO/distilled water.