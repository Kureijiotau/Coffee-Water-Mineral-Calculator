---
name: DIY concentrate persistence loop
description: Restored DIY concentrate plans must not trigger equivalent state updates during builder initialization
---

When restoring DIY concentrate preferences, treat structurally equivalent plans as unchanged both in the builder emission effect and at the workspace plan-state boundary.

**Why:** The restore effect can recreate equivalent plan objects on every render; either the DIY preference write or the workspace `recipeConcentratePlan` write can create a React maximum-update-depth loop and make the page unstable.

**How to apply:** Keep equality guards at both state boundaries and preserve the separate DIY storage record so Recipe Concentrate and DIY Lotus Drops remain independent.