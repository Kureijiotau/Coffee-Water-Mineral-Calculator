---
name: Profile picker sorting
description: Shared sort behavior for saved profile and recipe picker entries
---

User-owned Watermancer profiles and saved recipes share one persisted sort mode across every picker that displays them. The picker stays uncluttered while closed; when open, “Sort saved” offers Name A–Z, Date added newest first, and Date added oldest first. Name A–Z is the default. Manual ordering is no longer available. Built-in and published entries retain their existing order.

**Why:** A shared sort mode keeps saved entries consistent across Brewer, Alchemist, Watermancer, and profile comparison while keeping catalog groups stable. The user chose automatic sorting instead of manual ordering.

**How to apply:** Sort only saved `saved:` profile and `recipe:` recipe values. Decode creation timestamps from app-generated IDs for date modes; place IDs without valid timestamps last while preserving their relative order. Ignore the “Profile ·” and “Recipe ·” label prefixes for name sorting.