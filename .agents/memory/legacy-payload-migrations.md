---
name: Legacy payload migrations
description: Rules for recovering historical water recipe data safely across persistence and import boundaries
---

Historical recipe repairs should be selected by an explicit payload kind and version registry, with exact known legacy payload variants, rather than by broad display-name fingerprints.

**Why:** A name-only or name-plus-values heuristic can rewrite a legitimate recipe that happens to share a display name or similar chemistry, while stored plans, profiles, and Mixer snapshots still need the same historical repair.

**How to apply:** Add each new recovery to the central registry, then have file imports and every persisted source conversion construct that registry payload context. Preserve already-captured finished readings unless they match the registered legacy salt-only payload.