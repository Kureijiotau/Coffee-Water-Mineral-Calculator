---
name: Watermancer ion source preferences
description: User-facing per-ion source priorities for Watermancer matching
---

Watermancer source preferences are part of the unified plan and its deterministic input signature. The four choices are Water only, Water then salt, Salt only, and Don't care; Don't care must remain mathematically neutral for backward compatibility.

**Why:** Users need to express practical sourcing intent without reopening the old technical settings panel, while existing matching behavior must remain unchanged unless they opt into a preference.

**How to apply:** Pass normalized preferences to both water filling and salt autocrafting, persist them locally, invalidate review previews when they change, and treat coupled-ion side effects as visible deviations rather than silently hiding them.