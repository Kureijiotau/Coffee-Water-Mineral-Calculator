---
name: Watermancer salt row order
description: The Watermancer salt table groups rows by anion while keeping citrate salts last.
---

Keep the Watermancer-only display order grouped by anion: chloride salts first, then sulfate and bicarbonate families, with supplemental salts before citrate and citrate salts at the bottom. Preserve the shared SALTS order for calculations.

**Why:** Grouping by anion makes coupled-ion choices easier to scan without changing recipe indexing or solver behavior.

**How to apply:** Use a presentation-only ordered ID list and retain each salt's original index when reading rows, forms, doses, and overrides.