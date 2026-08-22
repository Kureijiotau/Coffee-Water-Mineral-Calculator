---
name: Watermancer action guard
description: Recommendation actions must not be blocked by a stale invisible busy ref after deferred work or mode transitions.
---

Watermancer recommendation actions use a single-flight guard, but the guard must recover when its ref says busy while the visible running state is false.

**Why:** Deferred best-match work and workspace transitions can finish out of order; a stale ref otherwise makes Apply and Undo silently do nothing.

**How to apply:** Keep the ref and visible busy state synchronized, and clear an orphaned ref before rejecting a new recommendation action.