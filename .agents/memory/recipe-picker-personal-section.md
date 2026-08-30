---
name: Recipe picker personal section
description: How saved recipes and Watermancer profiles are grouped with catalog sources
---

User-owned recipes and Watermancer profiles share one personal picker section labeled “My saved profiles,” while built-in and published sources remain separate catalog sections.

**Why:** Users should never mistake their editable local items for read-only catalog recipes, and legacy target-source prefixes must not strand a saved profile in a catalog group.

**How to apply:** Build personal options from the saved collections rather than persisted picker categories; normalize a legacy `recipe:<profile-id>` source to `saved:<profile-id>` when it matches a saved Watermancer profile.