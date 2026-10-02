# Water Grading Sync and Slider Language

## Goal

Make saved Water Grading tastings available across a user's signed-in devices,
improve the five active 1–9 water-effect sliders with attribute-specific
sensory wording and color, and let users save optional additional notes with a
tasting.

Unfinished form values remain local to the device. Existing legacy tasting
records, scoring formats, and hidden historical fields remain readable and
editable without a data migration.

## Current behavior

- Water Grading saves tasting records only in the current browser's
  `localStorage`.
- Account sync already uses an authenticated, revisioned account-sync endpoint
  to merge saved profiles and DIY concentrate inputs across devices.
- Water Grading currently has five active affective sliders scored from 1 to 9.
  All five share the same generic labels, from “Extremely low” to
  “Extremely high,” including “Neither high nor low” at the midpoint.
- Slider color currently follows the same generic score ramp, and the range
  track remains browser-default gray.
- Saved records have no general-purpose additional-notes field.

## Approaches considered

1. **Extend the existing account sync (recommended).** Add saved tasting records
   and deletion markers to the current revisioned sync data. This reuses the
   existing sign-in, conflict, retry, and cross-device refresh flow. It requires
   updating the API contract, generated types, database schema, and migration.
2. **Create a dedicated Water Grading API.** This provides separate record
   endpoints but duplicates authentication, synchronization, conflict handling,
   and status behavior already available in account sync.
3. **Keep records local and add manual export/import.** This is less backend
   work but does not provide automatic cross-device sync.

## Design

### Saved tasting synchronization

- Sync saved Water Grading tasting records only. Do not sync an active unsaved
  form draft.
- Extend the existing account-sync payload with a typed collection of tasting
  records and record-deletion markers. Continue using the existing
  authentication and optimistic revision checks.
- Keep guest records in browser storage. On first sign-in on a device, merge
  guest records into the account collection by record ID and most recent
  change, rather than replacing either collection.
- Scope signed-in local records to the active account, following the existing
  account-sync storage scope. Saving, editing, or deleting a record notifies the
  account-sync flow. When a remote sync updates the stored collection, refresh
  the saved tasting list without resetting an unfinished form.
- Merge record edits by ID and change time. Represent deletes as timestamped
  tombstones so a stale record on an offline device cannot resurrect a deleted
  tasting. A later record edit can supersede an earlier tombstone.
- If sync is unavailable, preserve the successful local save or deletion and
  use the existing account-sync status/error path for the pending remote change.
- Add database defaults and a migration for the new collection fields. Validate
  the new request/response shape in the OpenAPI contract and regenerate the
  client/server types.

### Attribute-specific slider language and color

Apply this change to the five active affective sliders only: Fragrance / aroma,
Flavor / aftertaste, Acidity, Mouthfeel, and Overall. Do not change the
historical 0–10 or descriptive 0–15 scoring formats.

- Replace the shared low/mid/high wording with a nine-step sensory-intensity
  cue ladder for each slider. A larger value means the water's effect is more
  pronounced; wording must not label the result as inherently better or worse.
- Use the same attribute-specific cue for the live value description,
  accessible `aria-valuetext`, and the 1/5/9 scale-anchor labels.
- Example anchor wording:
  - Fragrance / aroma: “Barely perceptible” / “Clearly present” / “Vividly
    aromatic.”
  - Flavor / aftertaste: “Barely expressed” / “Clearly defined” / “Intensely
    expressed.”
  - Acidity: “Nearly absent” / “Bright and clear” / “Forcefully sharp.”
  - Mouthfeel: “Water-light” / “Medium weight” / “Dense and coating.”
  - Overall: “Subtle water effect” / “Clearly present” / “Strongly expressed.”
- Give each attribute a distinct sensory color family (aroma violet, flavor
  coral, acidity citrus-gold, mouthfeel blue, overall teal). Keep its descriptor
  text and score color within that family.
- Replace the default gray track with an accessible custom track. For each
  attribute, the filled portion moves from a muted, low-saturation tint at the
  low end to a more saturated, vivid version of that hue at the high end. Keep
  the unfilled portion neutral and the thumb aligned to the current score.
- Preserve visible keyboard focus, range semantics, and the existing slider
  values and scoring behavior.

### Optional additional notes

- Add an optional multiline **Additional notes** field immediately below the
  active affective sliders.
- Save non-empty notes on the tasting record, with a 2,000-character maximum.
  Show saved notes on the tasting card and restore them when reopening a tasting
  for edit.
- Allow older legacy records to have no notes. Editing a legacy record must
  preserve its original scoring format and hidden values while adding, editing,
  or clearing its optional notes.
- Notes sync as part of their saved tasting record; unfinished note text remains
  local with the rest of an unsaved draft.

## Error handling and data safety

- Account sync remains user-scoped and revision-checked. Failed sync must not
  discard the local record, notes, or deletion marker.
- Invalid remote tasting data must not overwrite valid local data; report the
  account-sync error through the existing status mechanism.
- Existing malformed-storage protection and save conflict checks in Water
  Grading remain in place.
- Older saved records without notes or the new sync metadata remain valid.

## Testing and acceptance criteria

- Unit-test the five per-attribute cue ladders, their boundary values, and the
  score-to-color progression.
- Unit-test account-sync merges for first-device guest data, independent
  additions, edits on both devices, edits versus deletes, and delete tombstone
  propagation.
- Unit-test optional notes in create, update, validation, persistence, and
  legacy record editing; confirm blank notes are allowed and older records
  remain valid.
- Browser-test slider cue changes and score colors, the subdued-to-vivid track
  progression, keyboard adjustment, note create/edit/display, and sync status.
- Confirm saved tastings appear after sign-in on another device, and that
  offline edits/deletions reconcile without losing unrelated records.
- Confirm active unsaved form values are not overwritten by remote collection
  refreshes.
- Run the calculator's unit tests, browser tests, typecheck, and build; run API
  tests/code generation and database migration checks for the account-sync
  contract change.