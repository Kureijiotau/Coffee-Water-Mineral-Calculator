---
name: Watermancer ion source preferences
description: User-facing per-ion source priorities for Watermancer matching
---

Watermancer source preferences are part of the unified plan and its deterministic input signature. The four choices are Water only, Water then salt, Salt only, and Don't care. For explicitly selected Don't care ions, matching minimizes target-relative absolute error: exact first, then the closest over- or under-target percentage. Legacy plans that omit preferences retain their previous policy scoring.

**Why:** Users need to express practical sourcing intent without reopening the old technical settings panel, and a small-target ion must not be sacrificed because raw ppm scoring favors larger ions. Existing callers without normalized preferences must remain compatible.

**How to apply:** Pass normalized preferences to both water filling and salt autocrafting, persist them locally, invalidate review previews when they change, and score explicit Don't care ions by `abs(actual - target) / target` for positive targets while keeping coupled-ion side effects visible.