---
name: Glacial-style matching placeholder
description: Watermancer has a clickable placeholder for the user's phased Glacial matching heuristic.
---

The Glacial-style matcher should be a separate automated strategy, not a change to the existing Closest match behavior. The requested phases are base mineral waters, preferred salts led by NaCl and MgCl2, calcium coverage while protecting bicarbonate, magnesium completion while accepting chloride overshoot, then sodium completion with a small allowed overshoot.

**Why:** The user wants to preserve the current matcher while developing a more practical, taste-driven workflow around a Glacial reference profile.

**How to apply:** Keep the placeholder clickable and non-mutating until the phased strategy is implemented and tested against the shared Watermancer plan and chemistry engine.