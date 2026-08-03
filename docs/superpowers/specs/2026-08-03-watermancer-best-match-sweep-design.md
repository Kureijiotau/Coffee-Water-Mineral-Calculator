# Watermancer Best-Match Strategy Sweep

## Status

Implemented and verified.

## Goal

Add an explicit Watermancer action that evaluates every available matching strategy with and without a permissive ion-deviation allowance, then applies the candidate with the lowest final total deviation.

The feature should improve matching quality without introducing a second chemistry engine, changing the selected water/salt inventory, or making strategy selection unpredictable during normal editing.

## User experience

Place a **Find best match** action next to the existing **Recalculate match** action in the Watermancer automatic-match card.

When activated:

1. Evaluate all three current Watermancer strategies:
   - Closest match
   - Water-first
   - GH / KH harmony
2. Evaluate each strategy twice:
   - **Strict:** zero tolerance for every ion.
   - **Permissive:** each ion may deviate by up to 10% of its target ppm.
3. Rank the six candidates by the existing final total deviation metric.
4. Apply the winning strategy and deviation policy to the visible advanced controls.
5. Invalidate and rerun the normal primary Watermancer match using those applied settings.
6. Show a compact confirmation in the automatic-match card, including the winning strategy, whether strict or permissive tolerance won, and its final total deviation.

The action is explicit and runs only when clicked. Ordinary target, water-volume, salt, hydration-form, and advanced-control edits retain the current behavior.

## Deviation rules

The strict candidate uses zero allowed deviation for every active ion.

The permissive candidate uses an ion-specific allowance:

```text
allowed deviation for ion = max(target ppm, 0) × 0.1
```

An ion with a zero target receives zero allowance. The permissive mode must not accidentally permit a zero-target co-ion to be added.

The candidate’s score is the existing policy-adjusted `totalWatermancerDeviation` value after the candidate’s modeled salt/water result is produced. The score is displayed in ppm and is not rounded until presentation.

The sweep must preserve the user’s existing overshoot controls. The strict/permissive comparison concerns ion deficit deviation only; configured overshoot ceilings remain active for every candidate.

## Winner selection and tie-breaking

Candidates are ranked by:

1. Lowest final total deviation.
2. If tied within the existing comparison precision, prefer strict tolerance.
3. If still tied, prefer the strategy currently selected by the user.
4. If still tied, preserve the existing strategy order:
   `closest-match`, `water-first`, `gh-kh-harmony`.

This makes the feature deterministic and avoids switching to a more permissive candidate when it provides no measurable improvement.

## State and data flow

The sweep should reuse the existing `WatermancerPlan`, `solveWatermancerRoutes`, and live-volume recalculation path.

The implementation should:

- Build a base plan from the current target ions, visible water volumes, selected salts, hydration forms, salt objective, ion priority, overshoot policy, and minimum practical salt doses.
- For each strategy/tolerance pair, create a candidate plan that changes only:
  - `strategy`
  - per-ion soft-deficit/deviation allowance used for the comparison
- Run the existing solver against the current visible waters and batch volume.
- Score the candidate’s resulting final ions using the existing total-deviation helper.
- Store only the winning strategy/tolerance in UI state, then use the existing recalculation nonce to refresh the normal primary result.

The winner’s result must continue through the current downstream path:

```text
winning plan
→ primary Watermancer result
→ current-volume route recalculation
→ practical salt-dose filtering
→ manual salt additions
→ ion coverage
→ final-mixture review
```

Manual salt additions are not included in the sweep’s automatic candidate ranking. They remain user-controlled and are applied after the automatic winner is selected, matching the existing product behavior.

The user’s visible allowed-deviation control should reflect the winning mode. Because the permissive mode is ion-specific, the UI should show a clear preset/state label rather than pretending that one scalar ppm value fully represents the result. If the current control cannot represent this policy without ambiguity, add a small state for the selected sweep mode and display the scalar control as the user’s manual override only after the sweep.

## Loading and failure behavior

The sweep is synchronous with the current in-browser solver. While it runs:

- Disable the sweep and recalculation buttons.
- Use a progress-independent label such as **Finding best match…**.

If no candidate produces a usable result, keep the current plan unchanged and show a non-blocking error/status message in the automatic-match card.

If the solver returns partial or blocked candidates, they remain rankable by final total deviation, but a fully matched candidate wins over a partial or blocked candidate when scores are otherwise equal.

## Accessibility and copy

- Button label: **Find best match**
- Tooltip/title: **Try every strategy with strict and 10% ion deviation policies**
- Announce the applied winner in visible text, not only through color.
- Keep the current **Recalculate match** action available for users who want to apply their selected advanced settings without benchmarking alternatives.

## Testing

Add solver-level tests for:

1. The sweep evaluates all six strategy/deviation combinations.
2. Strict mode produces zero tolerance for all ions, including zero-target ions.
3. Permissive mode produces `target × 0.1` per-ion allowances.
4. The lowest final total deviation wins.
5. Strict wins a tie against permissive.
6. The current strategy wins a remaining tie.
7. Existing overshoot settings remain active during both modes.
8. The chosen settings flow through the normal live-volume and manual-salt result path.

Add UI/state coverage where the project’s current test setup permits it:

- Clicking **Find best match** applies the winning strategy and refreshes the result.
- The confirmation identifies the winning mode and score.
- Existing **Recalculate match** behavior remains unchanged.

Run the existing test suite, typecheck, production build, `git diff --check`, and restart the web workflow after implementation.

## Non-goals

- No new chemistry formulas or alternate solver.
- No API, database, or integration changes.
- No automatic benchmarking on every keystroke or water-volume edit.
- No user-facing route-alternative selector.
- No automatic modification of selected waters, selected salts, hydration forms, or manual additions.