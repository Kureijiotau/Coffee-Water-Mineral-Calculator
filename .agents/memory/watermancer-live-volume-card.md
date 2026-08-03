---
name: Watermancer live volume result
description: Automatic-match result cards must recalculate from edited visible water volumes.
---

Watermancer's automatic match must treat visible water volumes as user-controlled inputs and recalculate the primary result directly from those visible volumes.

**Why:** Re-running the water-filling strategy after every `−/+` click restored a prior solver volume and made the automatic ion card appear frozen.

**How to apply:** Disable hidden route water application for live result recalculation, derive final ions from current water entries plus the primary candidate's salt strategy, and keep automatic salt targets fixed during micro-adjustments so compensation cannot hide a 1 mL water change.