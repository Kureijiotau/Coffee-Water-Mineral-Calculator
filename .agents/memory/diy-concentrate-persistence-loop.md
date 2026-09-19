---
name: DIY concentrate persistence loop
description: Restored DIY concentrate plans must not trigger equivalent state updates during builder initialization
---

Use the existing autosaved water-plan session as the source of truth for DIY Concentrate restoration; do not maintain a second DIY-specific persisted plan record.

**Why:** The separate DIY preference record duplicated the concentrate snapshot and its restore/write feedback loop caused repeated React updates.

**How to apply:** Restore the autosaved session once on app startup, pass its concentrate snapshot into the DIY builder, and keep plan state updates structurally guarded.