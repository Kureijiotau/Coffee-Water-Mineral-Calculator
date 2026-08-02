---
name: Watermancer route switch baseline
description: Route alternatives must be reversible and start from the last user-controlled water state.
---

Watermancer route buttons must execute from a stable baseline of user-controlled water volumes, not from the previously applied route's auto-filled output. Preserve that baseline while switching routes; clear it when the user edits, adds, or removes water.

**Why:** Switching between water-led and salt-led routes otherwise accumulates the first route's auto-filled water, making the comparison non-reversible and causing back-and-forth route selection to drift.

**How to apply:** Clone the baseline before the first route application, solve and execute every subsequent route from it, keep visible route output separate from the baseline, and invalidate the baseline on direct water changes.