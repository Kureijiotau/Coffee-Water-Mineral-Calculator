---
name: Workframe profile handoff
description: The approved boundary between the relationship-first Workframe builder and Watermancer target matching
---

Workframe is a relationship-first profile builder, not a second Watermancer solver. Its GH:KH, Mg:Ca, anion, alkali, and bicarbonate checks guide a final explicit ion snapshot. Finalization freezes that snapshot under a user-entered local profile name; sending it hands the saved target source to Watermancer, which remains responsible for translating ions into waters and salts.

**Why:** Duplicating solver logic in Workframe would create conflicting chemistry paths and make saved target profiles difficult to trust. The handoff preserves one source of truth for matching while still making the profile-building relationships visible.

**How to apply:** Keep future Workframe changes focused on relationships, guardrails, naming, and handoff state. Do not add salt or water optimization there; update the shared Watermancer target/profile contract if the final ion shape changes.