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

Route candidates and ion coverage should derive live from the current Watermancer plan; there is no separate user-facing Auto-match action. The selected route's final-ion profile must remain mounted and visible while plan inputs update.

**Why:** A separate Auto-match button created a fragile intermediate state, and volume-based visibility caused the ion card to unmount and remount during route selection.

**How to apply:** Keep the route selector visible whenever Watermancer is active, solve candidates from current inputs, preserve only the selected route ID and stable source-water baseline across route clicks, and use the selected candidate as the review-card source.

Route selection must preserve the Auto-match result surface during asynchronous plan updates, and the displayed Primary match should be the candidate with the fewest overshoots, using score as the tie-breaker.

**Why:** Applying an alternative changes several plan-signature inputs at once; treating the intermediate state as stale closes the route panel, while a higher-overshoot Primary route contradicts the user's safety preference.

**How to apply:** Keep a short-lived transition signature while applying a route, and rank candidates by overshoot count before score.

The Review Match panel should remain available for every active solver route, including routes that minimize or omit water, and should show original target GH/KH/TDS separately from the selected route's final mixture.

**Why:** Gating review visibility on mineral-water volume hid valid salt-focused routes and made it difficult to compare the route result against the user's original ionic objective.

**How to apply:** Drive review visibility from the active solver candidate, calculate route result metrics from its final ions, and calculate the original target cards from the Watermancer target profile.

Controlled overshoot is an explicit policy with an enabled flag, allowed-ion list, per-ion maximum ppm excess, and deterministic priority order. Unlisted ions remain hard ceilings, and permitted excess within its cap does not make a route partial.

**Why:** Overshoot is a chemistry tradeoff that must be visible and bounded, not an incidental side effect of choosing a water source or salt.

**How to apply:** Include the complete policy in the plan signature; pass it to water autofill and salt autocrafting; preserve the user's priority order across route alternatives; use stable source-index and priority tie-breakers; keep the default policy disabled with zero allowed ions.

Priority editing belongs inside the allowed-overshoot ion list rather than in a separate custom-order panel. Presets automatically reorder those rows; Custom order enables drag and arrow controls there, with visible priority numbers.

**Why:** Keeping selection, overshoot limits, and priority in one list makes the relationship between an allowed ion and its coverage priority immediately clear.

**How to apply:** Treat the active priority list as the single UI source for ordering, preserve it in the Watermancer plan signature, and show the same order in the solver explanation.

Numeric overshoot steppers should step once immediately, then repeat at a steady interval after a short hold delay, stopping on pointer release, cancellation, or leave.

**Why:** This supports both precise taps and efficient adjustment of ppm limits without requiring repeated clicks.

**How to apply:** Keep direct numeric entry available, clamp values to their configured range, and ensure repeat timers are cleaned up on unmount and pointer termination.

Route matching must remain available after setting a target even when no salts are selected; water-only plans can match or partially cover a target, while a completely empty water-and-salt plan remains blocked.

**Why:** Watermancer is target-first, and users should not have to make an arbitrary salt choice before seeing whether selected waters can solve the target.

**How to apply:** Gate route calculation on valid batch volume, not salt count; classify empty plans as blocked; preserve selected water and salt boundaries without inventing selections.

Salt matching must solve coupled allowed salts globally, not rely only on coordinate descent. A salt-led route must use balanced complete-ion scoring so it cannot trade a missing primary ion for a discounted counter-ion overshoot.

**Why:** Coordinate descent can get trapped when several salts must change together—for example, Kimoi's MgCl₂, CaCl₂, and NaCl relationship—producing both underdosed and oversupplied ions even though the original salt recipe is exactly reconstructable.

**How to apply:** Enumerate feasible active salt sets for the small allowed inventory, solve their non-negative coupled-ion system, and rank candidates with the complete target/overshoot objective. Keep “use more salts” distinct by holding water volumes, not by discounting overshoots.

Watermancer matching is target-first rather than profile-generating: selected waters and allowed salts are variables, while the selected ionic target remains authoritative. The default controlled budget is 0.5 ppm overshoot for positive target ions; only chloride and sulfate may absorb up to a 0.5 ppm deficit, and GH/KH deviation is included in route ranking.

**Why:** The intended workflow is to hit an existing ionic profile with whatever inputs are available, not to create a looser replacement profile. Primary GH/KH ions must not be sacrificed to improve a coupled counter-ion.

**How to apply:** Treat calcium, magnesium, sodium, potassium, and bicarbonate deficits as hard violations. Treat chloride/sulfate deficits within their small allowance as acceptable residuals, keep zero-target ions as hard ceilings, and rank policy violations before raw overshoot count.

Water-led routes must allocate base and added waters in one shared pass before salt matching; do not fill the groups sequentially.

**Why:** Sequential filling lets the first water group consume the mineral budget and makes a later magnesium/sulfate-rich water appear unused, forcing unnecessary MgSO₄ or similar salt doses.

**How to apply:** Treat all selected water entries as interchangeable variables during route filling, then restore their original UI groups after allocation so the final recipe still distinguishes base and added sources.

Watermancer should retain only the selected route identity; every target, water, salt, hydration-form, priority, or policy change must trigger a fresh complete solve from current visible inputs.

**Why:** Preserved route results or source snapshots make the interface feel incremental and can ignore a newly toggled salt or edited water even though the user expects every interaction to reconsider the full composition.

**How to apply:** Derive displayed candidates directly from the current plan and water arrays. A route click may execute and apply one fresh candidate, but it must not become a cached solver-result source for later renders.

Selected Watermancer salts are an allowed inventory, not a must-use recipe. The matcher should assign zero dose when another allowed salt reaches the target with a better coupled-ion profile.

**Why:** A salt can solve one ion while unnecessarily oversupplying its counter-ion; requiring every selected salt would turn an availability choice into harmful chemistry.

**How to apply:** Keep zero as a candidate dose for every allowed salt, optimize the complete ion profile, and label the UI as “Allowed” rather than “Used.”

Watermancer salt candidates must be practical to weigh: each salt is either omitted or dosed at least 10 mg of the selected physical hydration form.

**Why:** Sub-10 mg recommendations such as 0.4 mg KCl are not meaningfully doseable with normal kitchen or lab scales and should not be presented as finished recipes.

**How to apply:** Include per-salt minimum dose thresholds in the plan and solver objective, reject trace candidates during coupled-salt solving, and let mineral-water or alternate-salt routes win when they avoid an impractical dose.

Manual Watermancer salt additions are physical-mass overrides layered on top of the selected route; they may be entered independently of the automatic allowed-salt inventory and must flow through final ion, GH/KH, TDS, coverage, and recipe-step calculations.

**Why:** Users may intentionally fine-tune one salt after selecting a route, and the manual amount should remain exactly weighable in mg rather than becoming another solver-generated target.

**How to apply:** Keep manual additions separate from route candidates, convert them to the current hydration form only for chemistry calculations, and preserve the physical mg value when routes or automatic inputs change.

The selected Watermancer route must be tracked by both its stable route kind and its displayed ID, because the best-ranked candidate can be promoted into the primary card and receive a rewritten ID.

**Why:** Ranking can move Prioritize ions into the primary slot; matching only the old ID then makes the result card show a different candidate's chemistry.

**How to apply:** Resolve active candidates by route kind when the stored ID no longer matches, and label route cards from their actual kind rather than assuming the primary slot is balanced.

All automatic Watermancer salt output paths, including sodium correction and displayed recipe maps, must apply the physical minimum-dose rule; only explicit user-entered manual additions may intentionally be below that minimum.

**Why:** A post-solver correction or presentation-specific map can reintroduce the same unusable 1 mg dose that the solver correctly rejected.

**How to apply:** Practicalize automatic route targets before final-mixture, recipe, and salt-table calculations, while keeping manual physical-mass additions separate.

Displayed route results must not use stale calculated values after current inputs change; the route candidates and review values should recalculate live from the current plan.

**Why:** Showing an old route after a target, water, salt, priority, or policy change makes the review panel appear authoritative when it no longer describes the current plan.

**How to apply:** Preserve only the selected route identity and source baseline across route clicks; derive displayed route candidates and final ions from the live current plan.

Brewer dropper dosing should use a user-calibrated drops-per-mL value rather than assuming every dropper delivers the same volume.

**Why:** Drop size varies with the dropper and squeeze technique, so a fixed 20 drops/mL assumption can systematically misdose mineral stocks.

**How to apply:** Keep a sensible default until calibration, persist the measured value locally, and use it consistently in recipe cards and step-by-step dosing instructions.