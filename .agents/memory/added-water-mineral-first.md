---
name: Added-water mineral-first matching
description: Quality-first Watermancer strategy that adjusts Added waters before tightly constrained salt finishing.
---

Added-water mineral-first is a separate Watermancer strategy and a candidate in
the Best Match sweep. It increases selected Added-water volumes deterministically
to maximize calcium and magnesium while keeping bicarbonate at target, zero-target
ions at zero, and other water-phase ions at or below 130% of target. Salt
finishing may add at most 10% above positive targets for non-bicarbonate ions;
bicarbonate gets no positive allowance.

**Why:** The user wants mineral waters to contribute as much useful calcium and
magnesium as possible without producing unusable chemistry or accepting weak,
random-looking matches.

**How to apply:** Keep the search deterministic and single-flight. Do not apply
partial candidates. Preserve existing strategies, fixed salt doses, and the
existing snapshot invalidation guard. Apply adjusted Added-water volumes only
when this strategy wins.