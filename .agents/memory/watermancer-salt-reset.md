---
name: Watermancer salt reset
description: The salt table has a compact reset action for clearing salt selection state.
---

Keep a small Reset control beside the Watermancer Dose header. It clears selected salt IDs and manual dose overrides, but preserves hydration-form choices and unrelated Watermancer settings.

**Why:** Users need a quick way to start a new salt-matching attempt without resetting the full water plan.

**How to apply:** Route the action through Watermancer manual-mode entry so automatic-match state is invalidated consistently.