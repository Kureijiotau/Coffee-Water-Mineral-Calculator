# Single-button Watermancer matching — implementation plan

## Objective

Replace the current user-facing Watermancer matching configuration with one
search-and-review flow:

1. The user edits targets, waters, salts, and doses.
2. The user presses **Find the best match**.
3. The internal deterministic search runs without mutating the active plan.
4. A validated candidate appears in a review preview.
5. **Use this match** applies the candidate atomically.

The existing solver dimensions remain available internally for candidate search
and regression tests.

## Existing implementation boundaries

- `artifacts/coffee-water-calculator/src/App.tsx`
  - Owns Watermancer state, matching handlers, route search, live result
    calculation, and the current matching-control JSX.
  - `handleFindBestWatermancerMatch` currently searches and applies the winner
    in the same callback.
  - `watermancerBestMatchRoute`, summary, message, and running state already
    provide part of the preview/action lifecycle.
  - The Advanced matching controls and `Apply current matching settings`
    action are in the Watermancer render section around the matching result
    cards.
- `artifacts/coffee-water-calculator/src/watermancerPlan.ts`
  - Owns plan and route candidate types plus plan cloning/signature helpers.
- `artifacts/coffee-water-calculator/src/autoFill.test.ts`
  - Owns engine-level Watermancer matching regressions, including the 48-route
    candidate sweep and Added-water mineral-first constraints.
- `docs/superpowers/specs/2026-08-06-single-button-watermancer-design.md`
  - Approved behavior and acceptance criteria.

## Work sequence

### 1. Separate internal search defaults from user-facing controls

In `App.tsx`:

- Keep `findBestWatermancerMatch` and its internal candidate dimensions.
- Define one internal search configuration/default path rather than deriving
  search behavior from controls that are about to disappear.
- Preserve persisted plan parsing and existing solver fields for compatibility.
- Remove or stop wiring UI-only state that exists solely for:
  - strategy selection;
  - salt objective selection;
  - priority preset selection;
  - deviation selection;
  - manual overshoot editing.
- Keep shared chemistry and fixed-dose behavior unchanged.

Acceptance:

- The internal search still returns the same candidate count and candidate
  dimensions.
- Existing engine tests remain meaningful.
- No saved plan crashes because an old matching field is present.

### 2. Introduce explicit matching lifecycle state

In `App.tsx`:

- Model the flow as idle, searching, and reviewing.
- Retain the captured input signature and cloned input snapshot for the pending
  search.
- Change the search handler so it:
  - captures the snapshot;
  - runs the full search;
  - validates that the snapshot is still current;
  - stores only a cloned validated winner as preview state;
  - does not update active water, salt, or strategy state.
- Keep the existing single-flight generation guard.
- Clear the preview when any relevant editable input changes.
- Keep no-valid-result and stale-result messages separate from the preview.

Acceptance:

- Search does not alter the active plan.
- Repeat clicks are ignored while searching.
- Input changes during search discard the result.
- Input changes while reviewing invalidate the preview.
- Search failures leave the active plan untouched.

### 3. Add atomic preview application

In `App.tsx`, add a dedicated `handleUseWatermancerBestMatch` handler:

- Confirm the preview still matches the current inputs.
- Apply the complete candidate in one state transition:
  - base-water volumes;
  - Added-water volumes when the winning strategy changed them;
  - salt targets;
  - hydration/form state when represented by the candidate;
  - related Watermancer result state and recalculation nonce.
- Clear preview state after successful application.
- Add `handleDismissWatermancerBestMatch` to clear preview state without
  mutating the active plan.
- Ensure preview objects are cloned so later edits cannot mutate active state.

Acceptance:

- **Use this match** applies the complete candidate.
- **Keep current plan**, dismissal, and close leave active state unchanged.
- Stale previews cannot be applied.

### 4. Simplify the Watermancer UI

In the Watermancer JSX in `App.tsx`:

- Remove the Advanced matching controls section completely.
- Remove the `Apply current matching settings` action.
- Remove route-count badges, strategy/objective/priority/deviation summary
  details, and solver terminology.
- Keep one dominant **Find the best match** action.
- Use plain busy copy:
  - `Searching your water and salt options…`
- Replace the current applied-result summary with a separate review card:
  - `Review your recommended match`;
  - water volume recommendations;
  - salt dose recommendations;
  - final ions versus targets;
  - gaps and overshoots;
  - concise plain-language explanation;
  - `Use this match`;
  - `Keep current plan`.
- Show a clear non-actionable empty/error state when no valid candidate exists.
- Keep manual water filling only if it remains a distinct user input action
  rather than a second matching strategy.

Acceptance:

- Only one matching action is visible.
- No internal route count, strategy, salt objective, priority, deviation, or
  overshoot configuration appears in the primary Watermancer UI.
- The preview is visibly separate from the active plan.
- Desktop and mobile layouts remain usable.

### 5. Update types and supporting helpers

In `watermancerPlan.ts` and `App.tsx`:

- Keep route candidates capable of representing internal quality validation.
- Add or refine a preview type if the UI should not consume the entire route
  candidate directly.
- Keep internal strategy labels available only where plain-language result copy
  needs them.
- Ensure compatibility helpers continue accepting old plan fields.

Acceptance:

- Typecheck passes without optional-state ambiguity.
- No UI component needs to know the internal search matrix to render a result.

### 6. Add regression coverage

In `autoFill.test.ts` and any existing UI/action test location:

- Preserve existing engine tests:
  - 48 candidates;
  - all strategy/objective/priority/deviation dimensions;
  - Added-water mineral-first limits;
  - invalid candidate rejection;
  - deterministic selection.
- Add action lifecycle coverage for:
  - search snapshot does not mutate active plan;
  - repeat clicks are ignored;
  - stale input invalidates search result;
  - invalid search leaves active plan unchanged;
  - preview dismissal leaves active plan unchanged;
  - confirmed application applies the full candidate;
  - editing inputs while preview is open clears the preview.
- Add render coverage if the project’s current test setup supports it; otherwise
  keep the UI assertions in small exported pure helpers and test those.

Acceptance:

- All existing tests remain green.
- New lifecycle behavior is covered without weakening chemistry assertions.

### 7. Verify and clean up

Run:

```text
pnpm --filter @workspace/coffee-water-calculator test
pnpm --filter @workspace/coffee-water-calculator run typecheck
pnpm --filter @workspace/coffee-water-calculator run build
git diff --check
```

Then:

- Restart `artifacts/coffee-water-calculator: web`.
- Refresh workflow and browser logs.
- Capture the Watermancer preview at desktop and mobile sizes.
- Confirm the main UI shows one matching action.
- Confirm the preview does not mutate the active plan until confirmation.
- Confirm the workflow starts without runtime errors.

## Non-goals

- Do not rewrite the chemistry engine.
- Do not delete internal solver strategies or candidate dimensions.
- Do not change mineral calculations, hydration math, or fixed-dose semantics.
- Do not add a new backend or persistence layer.
- Do not introduce a second user-facing matching mode.

## Definition of done

- Approved single-button matching design is implemented.
- Search remains deterministic, quality-gated, and snapshot-safe.
- Preview and confirmation are separate from active-plan state.
- Matching controls are removed from the UI.
- Tests, typecheck, build, diff check, workflow, and preview are clean.