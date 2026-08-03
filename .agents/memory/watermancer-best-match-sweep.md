---
name: Watermancer best-match sweep
description: Watermancer can explicitly benchmark all strategy and tolerance combinations before applying the lowest-deviation winner.
---

Watermancer's Find best match action evaluates each matching strategy with strict zero deficit tolerance and permissive per-ion tolerance of 10% of the positive target, then applies the lowest final total deviation.

**Why:** Users wanted a single explicit way to compare the available strategies instead of manually trying combinations, while keeping normal edits predictable and preserving the existing chemistry solver.

**How to apply:** Keep the sweep synchronous and opt-in. Preserve selected waters, salts, hydration forms, overshoot ceilings, and manual salt additions. Break ties deterministically in favor of matched status, strict tolerance, the current strategy, then the established strategy order.