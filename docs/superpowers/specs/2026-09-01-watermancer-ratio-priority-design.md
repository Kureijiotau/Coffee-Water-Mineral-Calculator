# Watermancer Ratio-Priority Matching

**Date:** 2026-09-01

## Summary

Add a second Watermancer matching mode that prioritizes the mineral character
represented by the active ion relationships while preserving the current
target-value workflow as the default and keeping its behavior unchanged.

The two modes are:

- **Target values:** Match the selected ion targets using the existing
  Watermancer behavior.
- **Ratios:** Treat positive target values as hard minimum floors, then prefer
  candidates whose final GH:KH, Mg:Ca, Cl:SO₄, and Na:K relationships are
  closest to the active profile. Among similarly close ratio matches, prefer
  lower modeled mineral load/TDS.

Ratio mode may produce a final water above the profile's positive target
values. It must not silently underfill a positive floor, violate existing
zero-target protections, or weaken practical dose and safety rules.

## Goals

1. Let users switch between absolute target matching and recipe-character
   matching without changing their selected waters, salts, volumes, or manual
   doses.
2. Reuse the existing Watermancer chemistry calculations and candidate
   generation rather than creating a second chemistry engine.
3. Keep the current target-value mode behavior unchanged.
4. Make the live Current ion readings card explain both absolute floor coverage
   and ratio quality.
5. Make ratio mode deterministic, testable, and reproducible in saved sessions.
6. Build and verify the ratio calculations in isolation before integrating them
   into the live Watermancer UI.

## Non-goals

- Replacing the existing target-value solver.
- Removing or redesigning the Ion relationships page.
- Allowing ratio mode to underfill positive target floors.
- Treating a zero-target ion as freely available.
- Adding a separate ratio-only chemistry or water-composition engine.
- Automatically changing user-selected waters, salts, hydration forms, volumes,
  or manual dose overrides when the mode is switched.

## User experience

### Mode control

Add a compact segmented control near the Watermancer target cards:

`Match by: Target values | Ratios`

Target values is the default for new and legacy sessions. The selected mode is
part of the Watermancer plan and session snapshot.

Switching modes:

- preserves every current Watermancer input;
- invalidates the current match and recomputes candidates;
- changes only candidate ranking and result interpretation;
- does not rewrite the target profile.

The ratio mode uses the relationships represented by the active target profile
after the Ion relationships editor has sent its values to Watermancer. This
keeps the target profile and ratio constraints synchronized without introducing
a second unsaved ratio state.

### Current ion readings

The existing live card remains the source of truth for final ion values. It
continues to recalculate from visible water volumes and salt doses after every
relevant edit.

In Target values mode, the card keeps its current target comparison.

In Ratios mode:

- positive target markers are labeled **Minimum floor**;
- values above a positive floor are shown as acceptable excess rather than an
  automatic failure;
- values below a positive floor remain visibly flagged;
- the card shows desired versus actual GH:KH, Mg:Ca, Cl:SO₄, and Na:K values;
- each relationship receives a clear status such as **On ratio**, **Close**, or
  **Drifting**;
- the card exposes modeled total mineral load/TDS so lower-load candidates are
  distinguishable;
- undefined ratios caused by a zero denominator are labeled unavailable rather
  than represented by an invented number.

Water and salt edits continue to update the actual readings and ratio summary
immediately. The existing transient feedback and Follow behavior remains
independent of the new mode.

## Matching contract

### Absolute floors

For every active ion with a positive target, ratio mode requires:

`actual ion >= target ion`

The same tolerance and numeric handling used by existing Watermancer
calculations applies at the boundary.

An ion with a zero target remains protected by the existing zero-target
ceiling behavior. Ratio mode does not turn an explicitly excluded ion into an
unrestricted overshoot.

Existing physical and safety rules remain active:

- selected waters and salts define the allowed inventory;
- visible water volumes remain fixed user-controlled inputs;
- practical salt-dose minimums remain enforced;
- hydration-form and physical-dose handling remain unchanged;
- manual physical salt doses remain part of the final mixture.

Ratio mode changes the meaning of a positive target from an absolute-mode
ceiling to a minimum floor, so ordinary positive-target overshoot is allowed
without requiring the absolute-mode overshoot toggle. True safety ceilings and
zero-target protections remain enforced.

### Desired relationships

The ratio constraints are:

- GH:KH, using derived GH and KH from the final ion totals;
- Mg:Ca;
- Cl:SO₄;
- Na:K.

The Ion relationships editor remains responsible for producing coherent target
ions. Its GH anchor behavior remains authoritative: Mg and Ca represent a
fixed CaCO₃-equivalent GH budget, and KH maps to bicarbonate when imported.

For each relationship with a positive denominator, ratio error is measured as
a symmetric relative error:

`abs(log(actual ratio / desired ratio))`

An actual ratio of zero, or an unavailable denominator, receives a deterministic
unavailable penalty and is explained in the result rather than treated as an
exact match.

### Candidate ranking

Ratio mode ranks candidates lexicographically:

1. Whether all positive target floors are satisfied.
2. Ratio error across the evaluable relationships.
3. Modeled total mineral load/TDS and total positive excess.
4. Existing deterministic Watermancer tie-breakers.

The first criterion is a feasibility boundary, not a way to trade one
under-target ion against a better ratio. A candidate below a positive floor
cannot be presented as a clean ratio match while a floor-satisfying candidate
exists.

If no candidate satisfies every floor, Watermancer may show the least-bad
available candidate as **Partial**, but must display the floor deficits and
must not label it as a successful match. Within the partial set, ratio error
still provides the primary quality signal before TDS.

## Data flow and architecture

### Isolated ratio evaluation

Add a focused, pure ratio evaluation layer that accepts:

- a completed Watermancer candidate's final ion totals;
- the active target-ion floors;
- the active desired relationships;
- the existing normalized policy inputs needed to classify candidate validity.

It returns:

- floor satisfaction and per-ion floor deficits;
- actual derived GH and KH;
- actual and desired relationship values;
- per-relationship ratio errors and availability;
- aggregate ratio error;
- modeled total mineral load/TDS and positive excess;
- a structured explanation suitable for the existing review card.

The layer must not mutate Watermancer plan state, selected waters, salts, or
manual doses.

### Existing solver integration

Extend the existing candidate scoring/ranking path with a matching-mode
branch:

- `Target values` calls the existing scoring path unchanged.
- `Ratios` calls the new ratio evaluator and ranking path.

Candidate generation, coupled-salt solving, water allocation, practical dose
floors, and result object shape remain shared wherever possible. The mode
must be included in the deterministic plan/input signature so stale results
cannot survive a mode switch.

### Live readings integration

Pass the active matching mode and ratio evaluation data into the existing
Current ion readings renderer. Reuse the existing ion-row renderer for actual
ppm values and add ratio-aware labels/statuses around it. Do not create a
second live chemistry calculation in the component layer.

### Saved sessions and compatibility

Add the matching mode to the Watermancer plan/session snapshot. When importing
or restoring a legacy session with no mode field, default to `Target values`.

The active ratios remain reproducible because the imported ratio values are
already represented in the saved target-ion profile. No new independently
mutable ratio draft is stored in the Watermancer session.

## Safe implementation sequence

1. Create the isolated pure ratio evaluator and ranking helpers.
2. Add unit tests for:
   - floor satisfaction and deficits;
   - exact and near ratio matches;
   - symmetric ratio error;
   - lower-TDS preference after ratio quality;
   - derived GH/KH evaluation;
   - zero-target and unavailable-ratio handling;
   - deterministic ties;
   - partial results when no candidate satisfies all floors.
3. Run the calculator test suite, typecheck, and production build before
   changing the live Watermancer integration.
4. Add the matching-mode field and route target-mode versus ratio-mode scoring
   through the shared candidate path.
5. Add the segmented control and mode-aware result/readings presentation.
6. Add session round-trip and legacy-default tests.
7. Restart the calculator workflow and verify the preview, browser console, and
   final live readings.

If integration introduces a regression, revert the adapter/UI integration
without discarding the isolated evaluator and its tests.

## Error and edge-case behavior

- Invalid or missing relationship inputs keep ratio mode unavailable until the
  relationships are valid.
- A zero denominator makes that relationship unavailable; it is not assigned an
  artificial ratio.
- A positive floor deficit is always visible in partial results.
- An above-floor positive value is not itself a failure in ratio mode unless a
  true safety ceiling rejects it.
- Zero-target overshoot continues to use the existing hard-ceiling behavior.
- No candidate or an empty water-and-salt plan remains blocked using the current
  Watermancer gating rules.
- Changing mode, targets, waters, salts, volumes, hydration forms, priorities,
  policies, or manual doses invalidates stale match previews.

## Verification

The feature is complete only when:

- existing target-value tests still pass without changed expectations except
  where the new mode field requires a legacy default;
- ratio evaluator and ranking tests cover the contract above;
- full calculator tests, typecheck, and production build pass;
- target mode produces the same results as before the feature;
- ratio mode updates after water and salt edits;
- the Current ion readings card shows actual values, floor status, ratio status,
  and modeled load without duplicating chemistry logic;
- saved ratio-mode sessions restore the mode and all existing plan inputs;
- legacy sessions restore to Target values;
- the live preview starts without browser console errors.