# App Performance and Watermancer Readings — Implementation Plan

## Objective

Load Mixer, Water Tasting, Ion Ratios, and the Watermancer-only Label Scanner
on demand. In the Classic readings panel, move GH, KH, and Modeled TDS into an
inline summary directly below Ratios. Preserve all existing calculations,
source selection, workspace handoffs, and Compact readings behavior.

## Work sequence

### 1. Put Classic metrics below Ratios

- Extend `WatermancerMetricSummary` with an inline presentation that preserves
  its `data-source`, accessible labels, preview context, and target/final source
  controls.
- Move its Classic-only render in `App.tsx` from above the ion rows to directly
  after the Ratios line. Leave the Compact `WatermancerCompactReadings` summary
  unchanged.
- Keep the three values sourced from existing `WatermancerMetricValues` and
  retain the explicit “Modeled TDS” label and units.

### 2. Defer standalone workspace modules

- Replace static component imports in `App.tsx` with `React.lazy` imports for
  `WaterMixer`, `WaterTastingTab`, `IonRatioTable`, and `LabelScanner`.
- Keep Mixer type imports type-only; adapt named exports for `WaterTastingTab`
  and `IonRatioTable` to `React.lazy`'s default-component contract.
- Add a small reusable loading state and error boundary for deferred panels.
  Keep each boundary inside its existing panel shell so the shared header
  remains visible. The error state provides an explicit reload action and warns
  that in-memory edits may be lost.
- Wrap the three standalone tab panels and the conditional Scanner with their
  panel-local `Suspense` and error boundary. Do not change the existing Guide
  loading behavior.

### 3. Add regression coverage

- Update `e2e/watermancer-compact-readings.spec.ts` to verify the Classic metric
  summary appears after Ratios, switches between target and final values, and
  retains accessible labels. Keep its Compact-rail assertions intact.
- Add browser coverage for initial-load deferral, first-visit loading, panel
  navigation/handoffs, and the chunk-failure recovery state where it can be
  exercised reliably.

### 4. Verify the change

Run the artifact checks:

```text
pnpm --filter @workspace/coffee-water-calculator run typecheck
pnpm --filter @workspace/coffee-water-calculator test
pnpm --filter @workspace/coffee-water-calculator run build
pnpm --filter @workspace/coffee-water-calculator test:browser
git diff --check
```

Compare the built initial entry against the 235,490-byte gzip baseline and
record emitted deferred chunks. Confirm a cold load does not request the four
deferred modules until selected, then smoke-test Mixer handoff, Water Tasting,
Ion Ratios import, and the Scanner. Confirm the Watermancer worker and match
results are unchanged. If the initial entry is not measurably smaller, do not
broaden the refactor.