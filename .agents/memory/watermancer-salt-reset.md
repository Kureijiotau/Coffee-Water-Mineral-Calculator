---
name: Watermancer salt reset
description: The salt table has a compact reset action for clearing salt selection state.
---

Keep a small Reset control beside the Watermancer Dose header. It clears selected salt IDs, shared salt targets, manual dose overrides, and input drafts, returning the table to zero while preserving hydration-form choices and unrelated Watermancer settings.

**Why:** Users need a quick way to start a new salt-matching attempt without resetting the full water plan, and a stale matcher result must not repopulate a table the user explicitly cleared.

**How to apply:** Invalidate deferred matcher work, clear applied/manual route state, return matching to automatic mode, then clear selected salts and dose state.