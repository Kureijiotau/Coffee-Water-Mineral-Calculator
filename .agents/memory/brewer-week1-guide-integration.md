---
name: Brewer Week 1 guide integration
description: The approved Week 1 learning panel and its recipe handoff boundary
---

The Brewer Week 1 guide is an optional learning panel. Its sourced recipe masses are converted into the calculator’s salt-target units, then the existing chemistry engine owns GH/KH, ion totals, dose display, and preparation.

**Why:** The Robert Asami sequence teaches comparison by changing mineral choices; duplicating chemistry in the guide would make its amounts drift from Brewer’s recipe card.

**How to apply:** Keep the Week 1 selection as a temporary Brewer recipe override. Clear that override on flavor-pyramid changes, questionnaire application, saved/external recipe loads, manual salt edits, mode reset, and reset.

The normal Brewer mineral card remains intentionally lightweight. While a Week 1 override is active, its recipe card and preparation checklist may reveal additional positive-target salts from that selected Robert recipe, such as magnesium chloride or potassium bicarbonate.

**Why:** Robert’s guide teaches mineral choices outside the default Brewer subset, but exposing those salts globally would change the lightweight Brewer experience.

**How to apply:** Gate guide-only salt visibility on the active Week 1 override; return to the original Brewer salt set as soon as the override is cleared.

The guide pantry builder must filter its full salt catalog by the active recipe targets, so unused default salts such as KCl do not appear beside a Robert recipe.

**Why:** A pantry entry implies a stock the user needs to prepare; showing inactive salts makes the guide recipe disagree with its mineral card and adds unnecessary work.

**How to apply:** For an active guide override, derive both the mineral card and pantry entries from the same positive-target salt set.