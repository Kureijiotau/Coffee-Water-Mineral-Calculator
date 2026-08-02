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

The separate pre-match strategy selector is intentionally removed; Phase 4 route cards are the only user-facing route-selection surface.

**Why:** The selector duplicated the solver's route alternatives and added an unnecessary decision step before Auto-match.

**How to apply:** Keep any internal primary strategy defaults needed by the solver, but do not reintroduce a standalone matching-strategy panel unless the route model changes substantially.

Post-match ion coverage must render from the active route candidate's final-ion profile and remain mounted whenever a solver result exists; it must not be gated by transient current water-volume totals.

**Why:** Applying a route updates water state asynchronously, and volume-based visibility caused the ion card to unmount and remount during route selection.

**How to apply:** Use the selected candidate as the display source of truth immediately after Auto-match and whenever a route is applied.

The Review Match panel should remain available for every active solver route, including routes that minimize or omit water, and should show original target GH/KH/TDS separately from the selected route's final mixture.

**Why:** Gating review visibility on mineral-water volume hid valid salt-focused routes and made it difficult to compare the route result against the user's original ionic objective.

**How to apply:** Drive review visibility from the active solver candidate, calculate route result metrics from its final ions, and calculate the original target cards from the Watermancer target profile.

Controlled overshoot is an explicit policy with an enabled flag, allowed-ion list, per-ion maximum ppm excess, and deterministic priority order. Unlisted ions remain hard ceilings, and permitted excess within its cap does not make a route partial.

**Why:** Overshoot is a chemistry tradeoff that must be visible and bounded, not an incidental side effect of choosing a water source or salt.

**How to apply:** Include the complete policy in the plan signature; pass it to water autofill and salt autocrafting; preserve the user's priority order across route alternatives; use stable source-index and priority tie-breakers; keep the default policy disabled with zero allowed ions.

Priority editing belongs inside the allowed-overshoot ion list rather than in a separate custom-order panel. Presets automatically reorder those rows; Custom order enables drag and arrow controls there, with visible priority numbers.

**Why:** Keeping selection, overshoot limits, and priority in one list makes the relationship between an allowed ion and its coverage priority immediately clear.

**How to apply:** Treat the active priority list as the single UI source for ordering, preserve it in the Watermancer plan signature, and show the same order in the solver explanation.