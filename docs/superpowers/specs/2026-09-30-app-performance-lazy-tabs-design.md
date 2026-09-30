# On-Demand Workspace Loading Design

## Status

Draft for user review. No application code has been changed.

## Goal

Reduce the JavaScript needed to open the default Calculator screen by loading
separate, non-default workspaces only when the user first opens them.

The measured baseline at commit `32c6d99` is an `index` JavaScript chunk of
825,211 bytes (235,490 bytes gzip). `App.tsx` is about 837 KB of source, and the
production build warns that the main chunk exceeds 500 KB. The Guide already
uses `React.lazy`; the other identified standalone panels are statically
imported.

This is a measured first pass, not a full `App.tsx` refactor. If the initial
entry does not become measurably smaller, stop and report the result before
expanding the scope.

## Proposed design

Use `React.lazy` for the existing standalone panel modules:

- `WaterMixer` when the Mixer tab is opened.
- `WaterTastingTab` when the Water Tasting tab is opened.
- `IonRatioTable` when the Ion Ratios tab is opened.
- `LabelScanner` when its existing conditional Watermancer section is shown.

Preserve the existing default and named exports, using a small named-export
adapter where `React.lazy` requires a default component. Keep type-only imports
for panel types.

Keep `App` as the owner of tab selection, shared profile/water collections,
callbacks, and cross-workspace handoffs. Keep the existing conditional panel
branches and their props. Add a panel-scoped `Suspense` fallback so the shared
header remains visible while a selected panel loads. Keep the Guide's existing
lazy-loading behavior.

Add a narrow error boundary around deferred panels. On a chunk-load failure,
show an inline message and an explicit reload action; do not reload
automatically. The message must warn that reloading may discard unsaved
in-memory edits.

## Constraints and non-goals

- Do not change tab routes, default tab selection, storage formats, or
  workspace handoff behavior.
- Do not change Watermancer solver algorithms, worker protocol, request guards,
  or matching results. Route computation and Best Match remain on the existing
  React-free worker path.
- Do not split inline Concentrate or Calculator code out of `App.tsx` in this
  pass.
- Do not add result caching, worker-message changes, a new bundler dependency,
  or backend/API changes.

## User-visible behavior

- Opening the default Calculator should not request the Mixer, Water Tasting,
  Ion Ratios, or Scanner component chunks.
- The first visit to one of those panels may show a brief, panel-local loading
  status, then the existing panel.
- Later visits should reuse the loaded module and show the existing panel
  without a new loading state.
- A deferred chunk failure should leave the rest of the app shell intact and
  give the user a deliberate recovery action.

## Risks and mitigations

- **Cross-workspace state:** Lazy loading changes module timing, not ownership.
  Keep all shared state and handoff callbacks in `App` and retain the existing
  component props.
- **Delayed effects:** These panels already mount only in their selected
  branches. Keep that mount behavior and verify data loads on first selection.
- **Failed chunk requests:** Catch failures locally; never blank the whole app
  or trigger an automatic reload.
- **Limited reduction:** `App.tsx` still contains inline Calculator and
  Concentrate UI, so this pass may not remove most of the main chunk. Measure
  before considering broader extraction.

## Verification

1. Run the app typecheck, unit tests, and production build.
2. Compare the post-build initial entry's compressed size against the
   235,490-byte gzip baseline and record all emitted panel chunks.
3. Confirm from a cold browser load that the four deferred chunks are absent
   until their panels are first selected.
4. Smoke-test tab navigation, Watermancer-to-Mixer profile handoff, Water
   Tasting history, and Ion Ratios import.
5. Confirm Watermancer worker behavior and solver results are unchanged.

Success requires a measurable reduction in the initial compressed entry and
no regression in panel navigation or handoffs. If the entry is not smaller,
stop this pass and report the measured result rather than automatically
extracting more of `App.tsx`.