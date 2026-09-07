---
name: Profile picker ordering
description: Shared ordering behavior for profile and saved-recipe picker entries
---

User-owned Watermancer profiles and saved recipes share one persisted order across every picker. The picker remains uncluttered while closed; when open, a three-horizontal-dashes Change order action exposes accessible up/down controls and Reset. Built-in profiles and built-in recipes are not reorderable.

**Why:** The user wants one consistent order across Brewer, Alchemist, Watermancer, and profile comparison without adding persistent controls to the normal UI. Built-in catalog entries should remain stable.

**How to apply:** Treat saved profile/recipe IDs as the reorderable set, append newly saved entries, remove deleted entries, preserve the complete cross-tab order when reordering from a picker that shows only a subset, and keep built-in profile alphabetical sorting separate from user order.