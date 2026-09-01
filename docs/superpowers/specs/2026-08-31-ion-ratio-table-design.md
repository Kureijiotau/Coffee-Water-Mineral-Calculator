# Ion Ratio Table Design

**Date:** 2026-08-31

## Goal

Give Watermancer users a fast control surface for tuning four familiar ion
relationships, seeing the calculated partner values immediately, and sending
the directly writable ion values into the existing Watermancer target cards.

The feature must not alter Watermancer's solver, matching strategies, target
source model, card layout, or saved-profile behavior.

## Accepted interaction direction

Use the clean instrument-row direction with an editable relationship:

- four spacious relationship rows;
- pair identity on the left;
- two balanced ion-value blocks with the swap control centered between them;
- one clearly labeled Relationship control on the right;
- a quieter diagnostic treatment for GH/KH and a stronger interaction treatment
  for direct-ion rows;
- immediate validation and recalculation;
- one explicit import action.

The table is a control surface, not a second Watermancer workspace.

## Standalone Ion ratios page

Ion ratios are exposed as a nested internal page rather than a permanent
top-level tab. The Watermancer target card provides a clear **Set ion ratios**
action opposite **Compare profiles** in the first target-water card.

Opening Ion ratios:

- sets the internal app tab to `ion-ratios`;
- keeps the current Watermancer targets and ratio draft intact;
- shows the app header, a focused Ion ratios page heading, the complete ratio
  table card, and a **Back to Watermancer** action;
- does not render the full Watermancer workflow or target card on that page.

The existing top-level navigation remains unchanged. Calculator is treated as
the parent workspace for active styling while the Ion ratios page is open.
Returning to Watermancer restores the Watermancer workspace without resetting
its current plan, targets, waters, salts, or saved preferences.

## Ratio definitions

The rows are persisted in this order:

1. **GH → KH** — diagnostic-only hardness relationship.
2. **Mg → Ca** — direct ion pair.
3. **Cl → SO₄** — direct ion pair.
4. **Na → K** — direct ion pair.

Both displayed ion values and the relationship number are editable. The
relationship is always `first value ÷ second value`.

When the relationship is edited, the first ion remains fixed and the second ion
is recalculated as `first value ÷ relationship`. When either ion value is edited
directly, the relationship recalculates from the two ion values. This makes the
first ion the relationship-editing reference without preventing direct edits to
either ion.

Each row also has a swap control between its two ion-value blocks. Swapping
exchanges the displayed labels and values, reverses the relationship direction,
and makes the newly first ion the fixed reference for future Relationship edits.
The orientation is persisted with the ratio draft. Import resolves the
orientation back to the correct underlying ion IDs, so swapping never changes
which six direct Watermancer ions are updated.

The initial reference values are:

- GH 34 ppm, KH 9 ppm;
- Mg 3.2 mg/L, Ca 2.0 mg/L;
- Cl 16.3 mg/L, SO₄ 4.2 mg/L;
- Na 7.8 mg/L, K 1.0 mg/L.

The ratio value blocks use the established chemistry palette: pH stays cyan,
KH uses the existing amber buffer tone, and Mg, Ca, Cl, SO₄, Na, and K use
their corresponding `ION_MAP` colors. Display colors follow the current
swapped first/second orientation without changing the underlying ion mapping.

All ion-value inputs remain editable. Values must be finite and non-negative.
The relationship must be finite and greater than zero. The second value is
invalid when it is zero because the relationship would be undefined.

## GH/KH boundary

GH and KH are calculated hardness metrics in the existing chemistry model:

- GH comes from magnesium and calcium;
- KH comes from bicarbonate and carbonate.

The ratio table must use the existing `computeGH` and `computeKH` functions to
show the diagnostic relationship, but it must not treat GH or KH as raw
Watermancer ion targets. The GH/KH row is therefore never included in import.
After an import, the table shows the resulting GH/KH from the live Watermancer
target values so the relationship remains useful as a check.

## Import behavior

The import action is enabled only when every row is valid. It extracts only the
six actual ion values from the Mg/Ca, Cl/SO₄, and Na/K rows, then merges those
values into the current Watermancer target set:

- magnesium and calcium are updated from the Mg/Ca row;
- chloride and sulfate are updated from the Cl/SO₄ row;
- sodium and potassium are updated from the Na/K row;
- bicarbonate, citrates, and any future unrelated targets remain unchanged.

The merge uses the existing manual target override callback. No solver inputs,
strategies, source persistence, or saved profiles are changed by the ratio
feature. A successful import shows a concise confirmation and refreshes the
diagnostic GH/KH values from the imported target set.

## Persistence

The ratio draft is stored independently from Watermancer targets in local
storage. It is restored after refresh only when it passes the same validation
and normalization rules. Reset returns the ratio table to the accepted
defaults without changing Watermancer until the user explicitly imports.

## Architecture

Create a focused pure ratio module for:

- row and draft types;
- accepted row definitions and defaults;
- safe normalization, orientation persistence, and migration from the earlier
  anchor/ratio draft shape;
- relationship calculations and first-fixed relationship updates;
- swapping row orientation without changing underlying ion identity;
- validation;
- extraction of the six direct ion targets;
- merging extracted targets into an existing target set.

Create a focused React instrument-row component for rendering and editing the
draft.
Mount it inside `WatermancerIonProfileCard` and connect its import callback to
the existing `onTargetOverrideChange` path. Keep all current Watermancer target
source and solver code intact.

Move the table mount out of `WatermancerIonProfileCard` and render it from the
standalone Ion ratios page using the same live target values and override
callback. Add the page state and Watermancer submenu entry in `App` without
introducing URL routing.

## Error handling and accessibility

- Invalid values remain visible in their input and show a row-level message.
- The import button is disabled while any row is invalid.
- Relationship inputs are labeled with their ion pair and `: 1`; recalculated
  ion values remain available for direct editing.
- The target-card Ion ratios action is keyboard reachable and has an accessible
  name.
- Each input has an accessible label containing the pair and ion.
- Buttons are keyboard reachable and expose success text via an assertive or
  polite live region as appropriate.
- Local-storage failures fall back to in-memory defaults without blocking the
  calculator.

## Testing

Add unit coverage for:

- accepted defaults and row order;
- ratio recalculation;
- swapping labels, values, relationship direction, and import mapping;
- zero and malformed input handling;
- diagnostic-only GH/KH behavior;
- extraction of exactly six direct ion values;
- merge preserving bicarbonate, citrates, and unrelated targets;
- persistence normalization and reset behavior.

Run the calculator typecheck, complete test suite, production build, and a
preview screenshot with a clean browser console before delivery.