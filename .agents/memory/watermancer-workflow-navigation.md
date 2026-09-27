---
name: Watermancer workflow navigation
description: The Watermancer workflow rail scrolls to each matching stage
---

Make the Watermancer workflow rail steps actionable: scroll to the matching `data-watermancer-stage` section and focus it. For targets, salts, and matching, place the first actionable control in the visible space above the pinned compact readings dock; align other stages to their section start.

**Why:** A section heading can land in view while its controls remain under the pinned dock. Focusing the stage alone does not make those controls operable.

**How to apply:** Preserve the stage mapping and keyboard-accessible button behavior when adding or rearranging sections. Keep shortcut tests waiting for smooth scrolling to settle, then check the chosen controls and focus above the dock.