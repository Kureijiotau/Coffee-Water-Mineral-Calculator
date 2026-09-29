# Water Tasting CVA Scoring — Implementation Plan

## Objective

Replace the Water Tasting scoring UI after **Water target** and **The cup** with
the approved CVA-informed descriptive and affective assessments. Preserve both
earlier sections, current water-source snapshots, partial-note behavior, and all
existing notes without converting their scales.

## Existing implementation boundaries

- `artifacts/coffee-water-calculator/src/waterTasting.ts`
  - Owns the tasting record types, descriptor catalog, storage validation, and
    create/update helpers.
  - Keep the current local-storage key and support legacy records that have no
    scoring-version marker.
- `artifacts/coffee-water-calculator/src/WaterTastingTab.tsx`
  - Owns the target/cup form, scoring controls, history cards, and local save,
    edit, and delete flows.
  - Keep the target picker and cup details behavior unchanged.
- `artifacts/coffee-water-calculator/src/waterTasting.test.ts`
  - Covers scoring definitions, record lifecycle, and local-storage behavior.
- `artifacts/coffee-water-calculator/e2e/water-tasting.spec.ts`
  - Covers the user-facing tasting flow and is the place for browser regression
    checks.

No workspace navigation, chemistry solver, database, or water-catalog changes
are needed.

## Work sequence

### 1. Add a versioned scoring model while retaining legacy records

In `waterTasting.ts`:

- Define the seven descriptive attributes on integer scales from 0–15 and the
  five affective attributes on integer scales from 1–9.
- Represent new records with an explicit scoring version and separate optional
  descriptive and affective values.
- Treat records without that marker as legacy. Retain their current ratings,
  optional spectrum, and descriptor IDs as-is.
- Keep record-common fields and storage behavior shared across both formats.
- Update record validation, creation, and editing so each format validates only
  its own ranges and updating a record does not change its format.
- Keep all existing descriptor IDs and labels valid. Reorganize their groups
  into concise fragrance/aroma, flavor, main-taste, and mouthfeel groups without
  tying any descriptor to a score.
- Add pure helpers for per-value cues and the displayed affective scale anchors.
  Cue definitions must cover every selectable slider value.

Acceptance:

- Existing stored records without a version marker still load and round-trip
  unchanged.
- New partial records with either, both, or neither assessment populated are
  valid.
- Invalid values, unknown attributes, and invalid descriptor IDs are rejected
  without overwriting stored data.
- Updating a legacy record preserves its original 0–10 ratings and optional
  −5-to-+5 spectrum representation.

### 2. Replace the new-note scoring form with CVA-informed sliders

In `WaterTastingTab.tsx`:

- Keep the existing target picker and cup details sections, their fields,
  ordering, and selection behavior unchanged.
- New notes use the descriptive and affective sections from the spec; remove
  the five 0–10 rating buttons, `/50` total, and cup-shape sliders from the
  new-note path.
- Use native range inputs for every score, with correct bounds, integer steps,
  visible current value, and an attribute-specific cue that updates for every
  value. Mark the 0–15 scale at 0, 7.5, and 15 (with the midpoint positioned
  between selectable scores 7 and 8) and the 1–9 scale at 1, 5, and 9.
- Present optional descriptors within the descriptive section in the four new
  non-numeric groups. Keep descriptor selection independent of all scores.
- Use neutral single-hue intensity styling and a distinct low-to-neutral-to-high
  quality progression. Keep visible numbers, text cues, focus indication,
  keyboard use, and concise live announcements so color is never the only
  signal.
- Keep unset scores unset; do not initialize sliders to a score that would
  make a partial note appear answered.

Acceptance:

- A new note exposes exactly seven 0–15 descriptive sliders and five 1–9
  affective sliders.
- A user can save a note with any subset of those values.
- Each slider's accessible value description includes its current score and
  corresponding cue, and changing one slider does not announce the entire form.
- Selecting or clearing descriptors never changes any score.

### 3. Preserve legacy editing and render format-aware history

- When a legacy record is opened, show its original rating and cup-shape
  controls and values. Saving edits retains its legacy format; do not silently
  map values to CVA ranges.
- New-format records open in the new form and remain new-format when edited.
- Keep date, water identity, coffee identity, and edit/delete actions on every
  history card.
- New-format history cards show the Overall affective value when present and a
  compact breakdown of available descriptive and affective values, with no
  combined total.
- Legacy history cards retain their original `/50` and cup-shape summaries.
- Preserve the selected water's source ID, name snapshot, and readings behavior
  across create, edit, and reload.

Acceptance:

- Legacy and new records coexist in one storage list and can each be opened,
  edited, saved, and deleted.
- Reopening either format preserves its values and descriptor IDs.
- No new-format card renders a combined score.

### 4. Expand pure model and persistence tests

In `waterTasting.test.ts`, cover:

- all attribute IDs, ranges, integer boundaries, and cue coverage for every
  selectable value;
- all intermediate affective anchor labels;
- new-format partial records and storage round-trips;
- invalid new and legacy values being rejected without storage mutation;
- unversioned legacy fixtures loading without migration or loss;
- updates preserving each record's scoring format;
- descriptor regrouping while retaining all historical IDs;
- water-source ID, name snapshot, and readings remaining intact.

Acceptance:

- Model tests cover both scoring formats through the public module.
- Existing profile-option and safe local-storage failure tests continue to pass.

### 5. Add browser coverage for both form paths

Extend `e2e/water-tasting.spec.ts` to verify:

- the target picker and cup details remain available and work as before;
- new descriptive and affective sliders show bounds, score, cue, and accessible
  value text when adjusted;
- descriptors remain optional and do not alter slider values;
- a partial new note saves, appears in history, and reopens with the same
  values;
- a legacy fixture opens with its original controls, then saves without scale
  conversion;
- history cards use the correct format-specific summaries.

Acceptance:

- Browser tests exercise both new-note and legacy-note paths, including
  persistence after reload where the existing test setup supports it.

### 6. Verify the complete change

Run:

```text
pnpm --filter @workspace/coffee-water-calculator test
pnpm --filter @workspace/coffee-water-calculator test:browser
pnpm --filter @workspace/coffee-water-calculator run typecheck
pnpm --filter @workspace/coffee-water-calculator run build
git diff --check
```

Restart the existing web workflow once after implementation changes, inspect
workflow and browser logs, and verify the tasting form at desktop and mobile
widths. Confirm that neither preserved section changed and that history remains
usable with mixed legacy and new records.

## Non-goals

- Do not alter the Water target picker, the cup fields, water catalogs, source
  identity, or chemistry behavior.
- Do not convert legacy values, clear local storage, or change the storage key
  as part of this UI redesign.
- Do not add free-text notes, a combined total, physical/extrinsic assessments,
  or an official Q-score claim.
- Do not reproduce the paper CVA form layout.

## Definition of done

- New notes use the approved CVA-informed sliders and optional descriptors.
- Legacy notes remain readable and editable in their original scoring format.
- Mixed-format storage, partial saves, source identity, and history summaries
  are covered by tests.
- The preserved target and cup sections, existing app tests, browser checks,
  typecheck, build, and preview remain healthy.