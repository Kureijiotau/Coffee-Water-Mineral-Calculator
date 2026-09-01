---
name: Ion ratio swap persistence
description: Preserve row orientation while editing ratios after a user swaps the two ions.
---

After a user swaps an ion-ratio row, changing its Relationship must keep the swapped first/second orientation. Relationship editing may recalculate the editable second value, but it must not silently restore the original labels or ion mapping.

**Why:** The displayed order is an intentional user choice, and dropping it during a later edit makes the interface appear to undo the swap.

**How to apply:** Preserve the optional orientation flag in every row transformation, including relationship updates, direct edits, normalization, persistence, and Watermancer import mapping.