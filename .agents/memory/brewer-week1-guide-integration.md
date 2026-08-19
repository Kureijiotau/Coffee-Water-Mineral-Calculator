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

While a Robert guide recipe is active, do not show the Brewer calcium-chloride opt-out toggle in the pantry; keep that control available for normal Brewer recipes.

**Why:** Guide recipes are authored as fixed sourced comparisons, while the calcium substitution option belongs to the tunable everyday Brewer workflow.

**How to apply:** Gate only the toggle’s rendering on the presence of the Week 1 override; do not alter calcium calculations or normal Brewer fallback behavior.

When a Robert guide override is active, use the guide’s full mineral names in the recipe card, pantry builder, and dosing checklist; keep the shorter everyday Brewer labels outside the guide.

**Why:** The sourced guide names minerals as sodium bicarbonate and sodium chloride, while the normal Brewer workflow intentionally uses friendlier labels such as baking soda and table salt.

**How to apply:** Conditionalize labels on the active guide override without changing salt IDs, targets, hydration forms, or dose calculations.

The seven-day crash course lives on a dedicated Guide workspace page rather than inline in Brewer. The home card remains its primary entry point, and applying a lesson recipe keeps the user in Guide so they can choose dry-salt or dropper preparation in context.

**Why:** The lesson needs room for its seven-day navigation and supporting context without making the Brewer workspace feel heavy.

**How to apply:** Keep the preparation-method selector shared with Brewer’s recipe card, and keep Guide as navigation-only session state; saved calculator sessions should restore Calculator or Concentrate, not the Guide page.