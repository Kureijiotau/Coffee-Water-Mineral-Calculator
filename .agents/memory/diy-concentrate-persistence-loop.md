---
name: DIY concentrate persistence loop
description: Restored DIY concentrate plans must not trigger equivalent state updates during builder initialization
---

When restoring DIY concentrate preferences, treat structurally equivalent plans as unchanged before writing them back into parent state.

**Why:** The restore effect can recreate equivalent plan objects on every render; unconditional preference updates create a React maximum-update-depth loop and make the page unstable.

**How to apply:** Keep the equality guard around plan persistence and preserve the separate DIY storage record so Recipe Concentrate and DIY Lotus Drops remain independent.