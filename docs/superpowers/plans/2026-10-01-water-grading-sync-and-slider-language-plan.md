# Water Grading Sync and Slider Language — Implementation Plan

## Objective

Implement the approved design for account-syncing saved Water Grading tastings,
attribute-specific 1–9 sensory language and color ramps, and optional
per-tasting notes. Keep unsaved drafts device-local and preserve legacy scoring
data.

## Work sequence

### 1. Extend Water Grading records and local storage

- Add an optional notes field to tasting draft, editor, and record types, with
  validation and a 2,000-character limit. Records without notes remain valid.
- Add typed timestamped deletion markers alongside saved records.
- Scope local tasting data and deletion markers through the existing
  account-sync storage key mechanism. Preserve the current guest key/data for
  first-device migration.
- Notify account sync after saved-record create, update, and delete operations.
- Refresh the saved-record list after remote updates without resetting active
  form values.

### 2. Extend account sync and persistence

- Add Water Grading records and deletion markers to the OpenAPI request and
  response schemas; regenerate API client and Zod types.
- Add JSONB fields and safe defaults to `account_sync_data`, with a forward
  database migration.
- Include the collection in account sync local/remote conversion, baselines,
  equality checks, first-device guest merge, and in-flight change rebasing.
- Merge by stable record ID and change timestamps. Use deletion markers to
  prevent offline devices from resurrecting deleted records.
- Validate incoming records and marker data before persisting or applying them.

### 3. Update slider labels, color, and notes UI

- Replace generic affective anchors with nine attribute-specific
  sensory-intensity cues for Fragrance / aroma, Flavor / aftertaste, Acidity,
  Mouthfeel, and Overall.
- Keep live cue copy, `aria-valuetext`, and 1/5/9 anchor labels aligned.
- Add per-attribute muted-to-vivid slider gradients and matching cue/value
  colors; preserve keyboard focus and range semantics.
- Add the optional Additional notes textarea below the active affective sliders.
  Restore the note on edit and show it on saved tasting cards. Preserve legacy
  scores and hidden fields.

### 4. Add regression coverage

- Unit-test cues, color progression, notes validation/persistence, and legacy
  record compatibility.
- Unit-test account sync for guest migration, independent additions, concurrent
  edits, delete tombstones, and in-flight changes.
- Browser-test rating labels/colors, keyboard adjustment, notes create/edit,
  saved-list refresh, and sync status behavior.

### 5. Verify

Run API codegen, database migration checks, `pnpm run typecheck:libs`, and
targeted API/account-sync and calculator unit tests. Then run calculator
typecheck, browser tests, and build; restart the existing web and API workflows
once after the complete code batch and inspect their logs.

Production Neon schema changes are separate from the Replit development
database and require explicit authorization before applying.