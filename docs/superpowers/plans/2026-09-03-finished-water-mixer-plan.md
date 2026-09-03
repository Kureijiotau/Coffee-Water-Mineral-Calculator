# Finished Water Mixer — implementation plan

## Objective

Add a dedicated Mixer workspace that combines two finished waters by volume,
supports saved finished recipes, the existing water database, and manual final
ion readings, then presents and saves a recipe-steps-style blend result.

The Mixer must remain separate from salt solving and Watermancer target
matching. The existing Alchemist default and Watermancer behavior must remain
unchanged.

## Existing implementation boundaries

- `artifacts/coffee-water-calculator/src/App.tsx`
  - Owns workspace state and navigation, saved recipes/plans, local waters,
    on-demand community-water loading, and the existing recipe-step/result
    presentation.
  - Is large, so Mixer rendering should be isolated in a new component with
    explicit props.
- `artifacts/coffee-water-calculator/src/waterData.ts`
  - Owns `IonId`, active ion definitions, and ion metadata used by labels,
    colors, and derived calculations.
- `artifacts/coffee-water-calculator/src/localWaters.ts`
  - Owns locally saved database-water snapshots and water metadata.
- `artifacts/coffee-water-calculator/src/waterPlans.ts`
  - Owns persisted calculator snapshots and finalized recipe-share payload
    types.
- `artifacts/coffee-water-calculator/src/waterRecipeImage.ts`
  - Owns recipe-card data conventions used by existing recipe-step exports.
- `artifacts/coffee-water-calculator/src/empiricalWaters.ts`
  - Owns bundled finished-water reference compositions where the existing
    catalog surfaces them.

## Work sequence

### 1. Add pure Mixer model and persistence

Create a focused `waterMixer.ts` module containing:

- normalized source snapshot types;
- blend input/result types;
- volume-weighted ion calculation;
- validation for source readings and volumes;
- GH/KH/TDS derivation through existing chemistry helpers;
- saved Mixer recipe validation, load, save, create, and ID helpers.

Use a dedicated local-storage key and never coerce a salt-only recipe or
target-only profile into a finished water.

Acceptance:

- Equal and unequal volume calculations are deterministic.
- Zero-volume and zero-ion cases are handled safely.
- Invalid readings and zero total volume return explicit validation results.
- Saved recipes round-trip and retain source snapshots.

### 2. Add calculation and persistence tests

Create `waterMixer.test.ts` covering the pure model and persistence behavior.
Include the full edge-case matrix from the design spec, especially the
reported-TDS versus modeled-ion-total boundary.

Acceptance:

- Tests exercise the public Mixer module without React.
- Existing tests remain unchanged and passing.

### 3. Build the Mixer source selector UI

Create a focused `WaterMixer.tsx` component and any small supporting component
needed for source cards. The component should accept:

- eligible saved finished-recipe sources;
- local and community database waters;
- database loading/error state;
- a callback to request community-water loading;
- shared ion metadata and existing display helpers through props where needed.

Implement source modes for saved recipe, water database, and manual readings.
Keep source snapshots in local component/session state after selection so the
result does not depend on a later database response.

Acceptance:

- Water A and Water B are independently editable.
- Database search/selection uses the current catalog data.
- Manual readings validate without changing Watermancer state.
- Every interactive or meaningful display element has a stable `data-testid`.

### 4. Add Mixer result and save flow

In the Mixer component:

- render independent A/B mL inputs;
- compute live result from the pure model;
- render incomplete/error states without stale readings;
- render recipe steps for A, B, and total volume;
- reuse the existing ion result presentation conventions;
- offer a named “Save as recipe” flow;
- list and reopen saved Mixer recipes.

Acceptance:

- Editing either volume immediately changes final ions and recipe steps.
- The result uses the current final-reading display conventions.
- Saved blends reopen without requiring the database.
- Saved Mixer recipes do not appear as Alchemist salt recipes.

### 5. Integrate Mixer into workspace navigation

In `App.tsx`:

- add Mixer to the existing workspace type/navigation;
- preserve Alchemist as the current default;
- pass the existing water catalog state and community loader into Mixer;
- derive eligible finished recipe sources without treating salt-only recipes or
  target-only profiles as water readings;
- preserve Mixer draft state when switching workspaces during the session.

Acceptance:

- Mixer is reachable from the workspace navigation.
- Existing Brewer/Alchemist/Watermancer/Concentrate paths are unchanged.
- The community database request remains on-demand and shared with the
  existing picker.

### 6. Add UI/browser regression coverage

Extend the existing browser smoke coverage or add a focused Mixer spec for:

- navigation into Mixer;
- selecting a database water for a source;
- entering manual readings;
- changing A/B volumes and seeing final readings;
- incomplete and zero-total validation;
- saving and reopening a blend;
- preserving the existing default workspace.

Acceptance:

- User-visible primary behavior is covered.
- No stale result remains after clearing a source or invalidating a volume.

### 7. Verify and clean up

Run:

```text
pnpm --filter @workspace/coffee-water-calculator test
pnpm --filter @workspace/coffee-water-calculator run typecheck
pnpm --filter @workspace/coffee-water-calculator run build
git diff --check
```

Then restart the web workflow, inspect logs, and verify the Mixer preview at
desktop and mobile widths. Confirm that the API-backed database picker handles
loading and failure without preventing manual or saved-source mixing.

## Non-goals

- Do not add a new database table or endpoint.
- Do not rewrite the Watermancer solver.
- Do not add OCR/image-card parsing.
- Do not expand beyond two source waters in this version.
- Do not change the app’s current default workspace.

## Definition of done

- Dedicated Mixer workspace is reachable and visually consistent.
- Database, saved finished recipe, and manual source modes work for A and B.
- Volume-weighted final readings and derived metrics are correct.
- Recipe-step result and save/reopen flow work.
- Pure model, persistence, UI, and browser coverage are present.
- Existing calculator workflows, tests, typecheck, build, workflow, and preview
  remain healthy.