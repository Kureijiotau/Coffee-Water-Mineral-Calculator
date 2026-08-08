---
name: Watermancer live result
description: Automatic-match result cards must recalculate from edited visible water volumes and salt doses.
---

Watermancer's automatic match must treat visible water volumes and active salt doses as user-controlled inputs and recalculate the primary result directly from those visible inputs.

**Why:** Re-running the water-filling strategy after every `−/+` click restored a prior solver volume and made the automatic ion card appear frozen. A stored route final-ion snapshot also became misleading when users tweaked a Best match.

**How to apply:** Disable hidden route water application for live result recalculation, derive final ions from current water entries plus the active visible salt doses, and keep automatic salt targets fixed during micro-adjustments so compensation cannot hide a 1 mL water change. Manual dose overrides must replace suggested targets in the result.