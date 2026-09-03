# Mixer Recipe Import Implementation Plan

## 1. Add a shared import normalizer

- Extend the recipe-card metadata payload with optional final-water ion and
  metadata fields while preserving the existing salt recipe fields.
- Add a pure Mixer import parser that accepts:
  - finished-water `coffee-water-recipe` JSON with `ions`;
  - recipe-card metadata with embedded final ions;
  - `coffee-water-plan` sessions through an injected/shared final-ion derivation
    path.
- Normalize all accepted payloads to `WaterMixSourceSnapshot`.
- Reject salt-only payloads that have no finished readings.

## 2. Wire the Mixer file flow

- Add an Import recipe control and hidden file input to `WaterMixer`.
- Accept JSON, `.WATER`, and PNG recipe-card files.
- Read PNG metadata before falling back to text decoding.
- Fill the first empty source, or request an explicit A/B replacement when both
  sources are occupied.
- Clear stale errors on each new selection and preserve source state on failure.

## 3. Reuse existing session chemistry

- Extract or reuse the existing calculator session-to-finished-source
  conversion instead of duplicating Watermancer calculations.
- Keep imported snapshots independent from saved plans and recipe catalog edits.
- Preserve reported TDS metadata when the imported payload provides it.

## 4. Test the contract

- Add pure tests for each accepted format, PNG extraction, invalid inputs, and
  salt-only rejection.
- Add UI tests for source A, source B, replacement selection, failure
  preservation, and save/reopen after importing.
- Run the existing calculator tests, typecheck, production build, and browser
  verification where the browser runner is available.

## 5. Files expected to change

- `src/WaterMixer.tsx`
- `src/waterMixer.ts`
- `src/waterMixerImport.ts` (new, if the parser boundary is kept separate)
- `src/recipes.ts`
- `src/App.tsx`
- related unit/browser tests

No solver, database schema, or catalog behavior changes are required.