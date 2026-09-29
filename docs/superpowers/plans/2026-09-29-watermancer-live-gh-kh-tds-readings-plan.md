# Watermancer Live GH, KH, and TDS Readings — Implementation Plan

## Objective

Implement the approved live metrics summary in Watermancer’s Current ion
readings. Compact and Classic layouts must show the same target or final-mixture
GH, KH, and modeled TDS values as Review match, with a shared source selection
when a modeled mixture is available.

## Existing boundaries

- `artifacts/coffee-water-calculator/src/App.tsx`
  - Owns the Watermancer readings panel, preview detection, target/final ion
    maps, and the Review match metrics.
  - Continue using the existing `hasModeledIons` preview boundary.
- `artifacts/coffee-water-calculator/src/WatermancerCompactReadings.tsx`
  - Owns the pinned Compact readings rail and existing ion/ratio chips.
  - Keep the pinned dock compact; add metrics within the existing horizontal
    rail rather than adding a vertical row.
- `artifacts/coffee-water-calculator/src/waterData.ts`
  - Owns `computeGH`, `computeKH`, and canonical ion definitions.
- `artifacts/coffee-water-calculator/e2e/watermancer-compact-readings.spec.ts`
  - Covers live compact readings, view switching, and pinned-dock behavior.

## Work sequence

### 1. Share Review match metric calculations

- Add a small pure Watermancer metric helper for GH, KH, and modeled TDS,
  reusing `computeGH` and `computeKH` and the same complete ion values used by
  Review match.
- Use the helper for both Review match target/final values and the live readings
  props so the two displays cannot drift.
- Keep TDS as the sum of modeled ion concentrations in mg/L; do not use
  reported metadata TDS.
- Add focused unit tests for target and final ion maps, including exact GH/KH
  calculations and modeled TDS summation.

Acceptance:

- Helper output matches Review match calculations for both target and final
  ion maps.
- GH and KH remain ppm CaCO₃; modeled TDS remains mg/L.

### 2. Add a shared metric summary and source control

- Create a reusable summary component that displays GH, KH, and modeled TDS
  with visible units and an accessible **Targets / Final mixture** control.
- In preview, show the active target profile’s values and identify them as
  targets; do not present unavailable final-mixture values as real readings.
- When a modeled mixture exists, default to Final mixture and allow switching
  to Targets. Keep the selected source shared across Compact and Classic.
- Reset the default when the preview/model state changes; do not persist this
  UI-only selection.

Acceptance:

- The control is keyboard-operable, labeled, and exposes its selected state.
- Switching source changes all three values together.
- Changing Compact/Classic views does not discard the current source selection.

### 3. Integrate with Compact and Classic readings

- Add the summary to the beginning of the existing Compact horizontal rail so
  it is immediately visible without increasing the pinned dock’s vertical
  height.
- Add the same summary above the ion rows in Classic.
- Keep existing ion values, ratios, follow/pin controls, and matching behavior
  unchanged.

Acceptance:

- Both readings layouts show all three metrics and the appropriate source.
- Existing compact pinning and short-landscape behavior remain usable.
- The metrics remain understandable at mobile and desktop widths.

### 4. Add browser regression coverage

Extend `e2e/watermancer-compact-readings.spec.ts` to cover:

- profile target metrics in preview;
- target/final source selection after adding salt doses;
- equality with the corresponding Review match values;
- selection consistency after switching between Compact and Classic;
- existing pinned height and short-landscape behavior with the metrics present.

### 5. Verify the completed change

Run:

```text
pnpm --filter @workspace/coffee-water-calculator test
pnpm --filter @workspace/coffee-water-calculator test:browser
pnpm --filter @workspace/coffee-water-calculator run typecheck
pnpm --filter @workspace/coffee-water-calculator run build
git diff --check
```

Restart the existing web workflow once after implementation changes. Inspect
workflow and browser logs, and verify the readings at desktop and mobile widths.

## Non-goals

- Do not change Watermancer solver inputs, matching, salts, dose calculations,
  or GH:KH ratio behavior.
- Do not display conductivity-meter or reported TDS as modeled TDS.
- Do not persist the metric source selection.
- Do not redesign the Review match card or replace the existing ion rows.

## Definition of done

- Compact and Classic layouts show matching target/final-mixture GH, KH, and
  modeled TDS values.
- Preview uses target-profile values; modeled mixtures default to final-mixture
  values and remain switchable to targets.
- Unit and browser tests pass, existing pinned/landscape behavior remains
  healthy, and the app workflow starts cleanly.