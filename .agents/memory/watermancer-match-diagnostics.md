---
name: Watermancer match diagnostics
description: Structured explanations expose why the ranked primary route wins without re-running chemistry in the UI
---

Watermancer route candidates should carry solver-side diagnostics for raw target deviation, explicit policy allowance, remaining policy violation, fixed versus optional salts, omitted optional salts, and honored source preferences.

**Why:** A single score does not explain coupled-ion tradeoffs, while recalculating reasons in the result surface risks drifting from the ranking logic.

**How to apply:** Compute diagnostics when each route is created, derive the primary explanation from the ranked candidate and its alternatives, and let the UI render the structured values without duplicating chemistry calculations.