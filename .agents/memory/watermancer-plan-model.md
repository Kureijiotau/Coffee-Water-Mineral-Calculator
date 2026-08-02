---
name: Watermancer unified plan model
description: Shared orchestration contract for Watermancer water-fill and salt-match actions
---

Watermancer actions should be represented by one plan containing target ions, selected waters and salts, fixed volumes/doses, strategy, ion priority, and explicit overshoot policy. The existing chemistry helpers remain the calculation source of truth.

**Why:** Separate autofill and autocraft state made it difficult to know whether a displayed match still represented the user's complete set of decisions.

**How to apply:** Derive the current plan from the Watermancer UI state, use its deterministic signature to invalidate stale matches, and route orchestration through existing water-fill and salt-dose helpers rather than adding a second solver.

Phase 4 solver results should expose one primary route plus explicit alternatives, each carrying its own plan, water/salt choices, final ions, deviations, overshoots, and explanation. Route choices such as more water, more salts, or ion prioritization are presentation-level objectives over the shared chemistry helpers.

**Why:** Users need to compare actionable tradeoffs instead of treating strategy and priority controls as hidden solver settings.

**How to apply:** Keep the primary route as the default active match, store the complete solver result, and apply alternatives by updating the same Watermancer state and signature inputs so the selected route remains current.