---
name: Watermancer best-match dimensions
description: Best-match search varies strategy, salt objective, built-in priority preset, and tolerance while preserving added-water volumes.
---

Watermancer best-match evaluates the full built-in search space: three matching strategies, two salt objectives, three built-in priority presets, and strict/permissive deviation modes. Each candidate auto-fills only base waters; added mineral-water volumes remain fixed. Permissive mode allows up to 10% deficit tolerance for positive targets and zero tolerance for zero-target ions.

**Why:** The best result depends on coupled choices across water allocation, salt optimization, priority ordering, and tolerance—not on matching strategy alone.

**How to apply:** Apply the winning strategy, salt objective, priority preset, deviation mode, and filled base-water volumes together. Keep Custom priority as a manual setting, not an automatic sweep dimension.