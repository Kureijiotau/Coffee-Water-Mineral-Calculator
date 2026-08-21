# Watermancer Solver 2.0 Design

## Status

Draft for user review.

## Goal

Improve Watermancer matching accuracy by replacing the current single-path
coordinate descent salt adjustment with a bounded, coupled optimizer that can
solve the selected salt inventory globally for the current water and ion
target.

The existing Watermancer workflow remains intact:

- The selected target remains authoritative.
- Visible water volumes remain the user's baseline.
- Selected salts are an allowed inventory, not a must-use recipe.
- Fixed dose overrides remain user-owned and are never changed by the solver.
- Controlled overshoot and ion-source preferences remain explicit policy.
- Existing water-fill strategies and best-match sweep remain available.

The first version is an accuracy upgrade, not a UI redesign or a change to
Watermancer's persistence/share formats.

## Non-goals

- No new user-facing route chooser.
- No new target, water, or salt data model.
- No change to chemistry formulas, hydration-form calculations, or ion IDs.
- No change to the saved plan or recipe file formats.
- No automatic use of every selected salt.
- No Web Worker or asynchronous chemistry calculation in this phase.
- No removal of existing specialized route strategies.

## Current boundary

The application already has a unified `WatermancerPlan`, coupled-ion salt
contributions, fixed dose overrides, controlled overshoot, source
preferences, specialized route strategies, and a best-match sweep across
strategy, salt objective, priority preset, and strict/permissive mode.

The new optimizer should sit underneath the existing route execution boundary.
Route construction continues to decide water volumes and route-specific
policy. The optimizer receives the route's bottled ions, target ions, allowed
salt inventory, fixed salt doses, objective, and policy, and returns salt
targets plus diagnostics.

## Proposed architecture

### 1. Focused coupled-salt solver module

Extract the salt optimization into a focused module with a small public
contract. It should not import React or UI state.

Inputs:

- Allowed salt IDs and their ion contribution vectors.
- Current bottled-water ion totals.
- Target ion totals.
- Fixed salt doses.
- Salt objective (`balanced` or `coverage`).
- Matching preset/strategy-specific weighting.
- Controlled overshoot policy.
- Source preferences.
- Minimum practical salt doses.

Output:

- Automatic salt targets for non-fixed salts.
- Final ion totals including water and fixed doses.
- Per-ion deviations and policy violations.
- A deterministic score breakdown for tests and future explanations.
- Solver status (`matched`, `partial`, or blocked/empty as appropriate).

The existing route candidate remains the owner of water entries, plan
signatures, labels, and user-facing route metadata.

### 2. Candidate generation

For the small selected inventory, generate candidates from feasible active
salt sets:

1. Start with the empty set so a salt is never forced into the recipe.
2. Enumerate subsets of non-fixed, eligible salts.
3. For each subset, solve the coupled ion residual system using non-negative
   doses.
4. Reject numerically invalid or negative solutions.
5. Apply practical minimum-dose rules; a dose below the minimum is either
   removed or raised only when the resulting policy score remains acceptable.
6. Recalculate all ions from the canonical chemistry helpers.
7. Keep the best candidate for that subset and retain enough diagnostics to
   explain why it was accepted or rejected.

The solver must use full coupled-ion vectors during each solve. It must not
solve a primary ion independently and then discount the counter-ion.

### 3. Policy-aware scoring

Candidate ranking is lexicographic first, weighted second:

1. Count/severity of hard policy violations.
2. Total absolute deviation beyond configured allowances.
3. Primary-ion deficits, ordered by the active priority.
4. Unnecessary counter-ion overshoot and source-preference penalties.
5. Number of active salts.
6. Total practical salt dose.
7. Existing strategy/objective/priority tie-breakers.

The exact scalar score can still be used for sorting, but the result should
retain the component values so a future explanation can say whether a route
won because it matched calcium, avoided chloride, used fewer salts, or
respected a water-only preference.

Policy rules:

- A positive target with no explicit allowance treats excess as a violation.
- A zero-target ion remains a hard ceiling unless explicitly configured.
- Permissive mode allows only the existing positive-target deficit tolerance.
- Fixed dose contributions are scored as part of the final mixture but are not
  optimization variables.
- `water-only` ions exclude salts that contribute that ion.
- `salt-only` preferences penalize water contributions without changing the
  chemistry totals.
- `water-then-salt` preferences influence ranking, not target mutation.

### 4. Compatibility and rollout

The first rollout keeps the current optimizer available behind a narrow
internal fallback boundary:

- Run the new coupled solver for the same route inputs.
- If it produces a finite candidate, use it for the route's automatic salt
  targets.
- If it cannot produce a valid candidate, use the existing solver path.
- Preserve the existing result shape and route candidate IDs.
- Do not change the public UI result selection in this phase.

This allows existing route strategies, the best-match sweep, and live-volume
recalculation to consume the improved targets without a second UI state.

The fallback should be observable in development/test diagnostics, but it
should not silently alter the user-facing chemistry result. A fallback result
must still carry a valid final-ion calculation and status.

## Numerical behavior

- Use a stable tolerance for pivot/singularity checks.
- Clamp tiny negative floating-point results to zero.
- Recompute final ions from salt targets rather than trusting intermediate
  linear-algebra output.
- Use deterministic subset ordering based on the selected salt order.
- Use deterministic tie-breaks for equal scores.
- Never mutate the caller's plan, water entries, fixed-dose map, or salt list.
- Keep all calculations in the existing ppm basis used by the chemistry
  engine.

The solver should be correct for the common small-inventory case first. If
the selected inventory becomes too large for subset enumeration, the module
should return a clear bounded-search fallback rather than silently spending
unbounded time.

## Testing strategy

Add focused solver tests before changing route expectations:

### Coupled chemistry

- Reconstruct a known water profile with multiple coupled salts.
- Verify all coupled ions are included in the solve.
- Verify a solution that requires two salts together is found when
  coordinate descent would settle on a worse local candidate.
- Verify selected salts remain optional and unused salts receive zero dose.

### Constraints and policy

- Fixed salt doses remain unchanged.
- Zero-target ions remain hard ceilings.
- Explicit overshoot allowances are honored only for listed ions.
- Strict and permissive deficit modes retain their current meanings.
- Source preferences affect ranking without changing raw ion totals.
- Practical minimum-dose rules do not create a worse policy violation.

### Ranking

- A matched candidate beats a partial candidate even if its raw weighted score
  is close.
- A candidate with a primary-ion deficit loses to one with a coupled
  counter-ion excess when policy rules make that the correct tradeoff.
- Fewer active salts only breaks ties after chemistry accuracy and policy.
- Equal candidates resolve deterministically.

### Compatibility

- Existing `autoFill` and Watermancer route tests remain green.
- Best-match still evaluates the established search dimensions.
- Live visible-volume recalculation still holds the automatic salt targets
  fixed.
- Water plan serialization and recipe-only sharing tests remain unchanged.

The first implementation should add regression fixtures for at least one
exact multi-salt reconstruction, one impossible target, one zero-target
counter-ion ceiling, and one fixed-dose override.

## Acceptance criteria

The work is complete when:

1. The new solver is isolated behind a focused, testable module.
2. Existing route and persistence contracts remain unchanged.
3. All current tests pass.
4. New coupled-solver tests demonstrate a case the old coordinate path misses.
5. The solver never produces negative, non-finite, or policy-invalid doses as
   an accepted primary result.
6. Watermancer's current primary result and best-match UI continue to render
   without new route-selection state.
7. The implementation remains synchronous and responsive for the current
   selected-salt inventory.
