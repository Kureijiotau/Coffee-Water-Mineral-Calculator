---
name: Optimized practical coverage
description: Optimized matching uses percentile coverage, GH/KH balance, then a small absolute ion margin
---
Optimized final-ion matching follows a strict hierarchy: minimize aggregate final-ion target error percentile-wise, use final GH/KH balance to resolve effectively tied coverage, then allow practical positive-ion deviations only within an absolute 0.65 ppm margin. Zero-target ions remain hard ceilings, and strict, ratio, and explicit source-preference modes keep their existing semantics.

**Why:** Percentile coverage is the most faithful measure of target closeness, while GH/KH balance has a large taste effect and can distinguish near-equal coverage. A small absolute margin can then resolve coupled-salt tradeoffs without letting priority weights or large surpluses dominate.

**How to apply:** Keep the hierarchy source agnostic and solver-side. Use symmetric normalized ion error for the primary comparison, compare GH/KH only when coverage is effectively tied, and evaluate target ±0.65 ppm breakpoints as the final practical tie-breaker. Keep all actual surplus and deficit visible in deviations and diagnostics rather than silently treating it as exact.