# Added-water mineral-first matching strategy

## Goal

Add a fourth Watermancer matching strategy that uses selected Added waters as
adjustable mineral sources before using salts. The existing
`closest-match`, `water-first`, and `gh-kh-harmony` strategies must retain
their current behavior.

## User-facing behavior

The strategy will be named **Added-water mineral-first**.

It will:

1. Process the selected Added waters one at a time in their current UI order.
2. Increase each Added-water volume in small deterministic steps.
3. Prefer Added-water contributions that improve calcium and magnesium coverage.
4. Treat bicarbonate as a hard ceiling at its target during Added-water dosing.
5. Treat every zero-target active ion as a hard ceiling at zero.
6. Permit other positive-target ions to reach at most 130% of target during the
   Added-water phase.
7. If a water step creates an excessive non-bicarbonate ion, reduce the
   affected Added-water volume until the 130% ceiling is restored.
8. Keep the resulting Added-water volumes fixed while the salt phase runs.
9. Use only selected, non-fixed salts to fill the remaining ionic gaps.
10. Preserve all user-fixed salt doses.
11. Allow up to 10% above target for salt-phase spectator-ion overshoot, but
    never allow bicarbonate overshoot through this allowance.

The strategy may adjust Added-water volumes. It may also retain the existing
base-water volumes as part of the final mixture; it does not automatically
replace or erase the user's selected waters.

## Solver phases

This strategy is exposed as its own selectable matching strategy and is also
included in the existing **Find the best match** search.

The Best Match action is quality-first for the complete search. It must not
apply the first plausible approximation or silently fall back to a weak
candidate:

- The 48-route search is deterministic; no random sampling or random
  tie-breaking.
- The full search and final validation complete before any plan state changes.
- The action button is disabled for the entire search and repeat clicks are
  ignored.
- No intermediate candidate, provisional water volume, or provisional salt
  dose is applied.
- The winner must pass hard-ceiling and salt-policy validation before it can be
  applied.
- If no valid candidate survives, the current plan remains untouched and the
  UI reports that no valid match was found.
- If the captured inputs change while the search is running, the result is
  discarded and the current plan remains untouched.

### Phase 1: Added-water mineral pass

Start with the current visible base and Added-water volumes as the baseline.
For each selected Added water:

- evaluate candidate increases using a deterministic step size;
- calculate the resulting water-only ion totals;
- reject candidates that exceed target bicarbonate;
- reject candidates that exceed zero-target ion ceilings;
- reject candidates where any other positive-target ion exceeds 130% of
  target;
- among valid candidates, prefer the candidate with the greatest useful
  calcium/magnesium coverage, with deterministic tie-breaks for remaining
  target coverage and lower total excess.

The phase must never reduce a user's current Added-water volume. If the
current baseline already violates a ceiling, the strategy must report that
constraint and avoid increasing the violating source until the baseline can be
handled safely.

### Phase 2: Salt finishing

Use the existing salt optimizer with the Phase 1 water totals as fixed input.
Fixed salt doses remain outside the optimizer. Remaining selected salts may be
zero-dose or dosed as needed.

The salt policy for this strategy:

- bicarbonate has zero positive overshoot allowance;
- spectator ions may have up to 10% positive overshoot;
- deficits are still prioritized for closing the requested targets;
- existing salt hydration and dose calculations remain authoritative.

The strategy must not apply the current user's broad positive overshoot policy
to bicarbonate or use it to bypass the strategy's stated limits.

## Best Match integration

Add the strategy to the Best Match sweep and to the standalone matching
strategy selector. The search space becomes:

```text
4 strategies × 2 salt objectives × 3 priority presets × 2 deviation modes
= 48 candidates
```

The new strategy uses its dedicated two-phase solver. The other 36 candidates
continue through the existing route executor unchanged. The existing Best
Match action waits for all 48 candidates and final validation before applying
any winner.

Candidate selection continues to use the existing total policy-adjusted
deviation and tie-break order:

1. Lowest remaining deviation
2. Matched over partial
3. Strict over permissive
4. Current strategy
5. Current salt objective
6. Current priority preset
7. Stable built-in ordering

When the new strategy wins, apply its Added-water volumes as well as its
strategy, objective, priority, deviation mode, and salt targets. When another
strategy wins, preserve the existing rule that Added-water volumes remain
fixed.

## UI

Add **Added-water mineral-first** to the matching-strategy selector.

Update the Best Match button and summary copy from 36 to 48 routes. The
summary should identify the new strategy by its friendly label. While the
search is running, show a busy state and prevent reclicking until the result
or a clear no-valid-result state is available.

Explain the new strategy in its result text as:

> Added waters maximize calcium and magnesium first while protecting
> bicarbonate; salts finish the remaining gaps with tighter spectator-ion
> limits.

## Safety and edge cases

- A batch size of zero or no usable waters/salts produces a blocked candidate.
- Existing fixed salt doses are never changed.
- Bicarbonate is never treated as a spectator-ion allowance.
- Zero-target ions remain hard ceilings.
- The action snapshot and single-flight protections remain active for the
  complete 48-route search.
- Candidate inputs are cloned before mutation.
- Results are rejected if the user changes inputs during the sweep.
- A failed or invalid search clears provisional matching state and leaves the
  user's current plan untouched.

## Testing

Add regression coverage for:

1. The strategy is represented in the `WatermancerStrategy` and selector.
2. The Best Match sweep produces 48 candidates.
3. Added-water volumes can increase for the new strategy.
4. Added-water dosing does not exceed target bicarbonate.
5. Zero-target ions remain at zero during Added-water dosing.
6. Non-bicarbonate Added-water ions cannot exceed 130% of target.
7. Salt finishing permits the intended 10% spectator-ion allowance.
8. Bicarbonate receives zero salt-phase overshoot allowance.
9. Fixed salt doses remain unchanged.
10. Existing three strategies retain their current candidate behavior.
11. The new strategy's winner remains identifiable after application.
12. The Best Match button cannot be reclicked during the full search.
13. No partial candidate is applied before final validation.
14. An invalid or interrupted search leaves the current plan untouched.