# Lotus Drop Volume Scaler and Shared Calibration

## Goal

Let users scale the Lotus page's per-solution drop counts to a chosen amount of
brew water, while entering dropper calibration once per tip style instead of
repeating the same calibration on every solution card.

The result is a practical whole-drop dose for every Lotus solution in the
recipe. Water volume means brew water added before brewing, not finished coffee
yield.

## Existing behavior and constraints

- The Lotus recipe model uses a 450 mL brew-water basis and separate Round and
  Straight dropper styles.
- The current style model has different nominal rates for Round and Straight
  tips. Preserve the style distinction; do not silently treat them as identical.
- Existing per-dropper calibration records are saved with the DIY inputs.
- Lotus dropper cards represent separate mineral solutions; do not combine
  them into one stock.
- The existing Lotus recipe and chemistry calculations remain authoritative.
  This feature changes dosing presentation and calibration sharing, not the
  underlying chemistry.

## Product behavior

### Shared calibration by tip style

Move the calibration inputs out of individual dropper cards into one shared
calibration area. It contains separate measurements for:

- Round tips
- Straight tips

Each style's measurement is entered once and is used for every Lotus solution
card using that style. A measurement consists of a known number of drops and
the weight of the dispensed water in grams; treat 1 g of water as 1 mL for the
calibration calculation. Preserve the existing style selector and the existing
nominal-rate fallback when the selected style has not been calibrated, and
label that rate as an estimate rather than a measurement.

Persist calibration by style through the existing DIY input storage. Do not
create per-card calibration overrides in this design.

### Volume scaling

Place the scaler controls above the Lotus solution cards:

1. **Reference water volume:** Start at 450 mL, clearly labeled as the current
   Lotus recipe basis and editable by the user.
2. **Target water volume:** One value applied to the entire set of solution
   cards.
3. **Volume units:** Support mL, L, and US gallons. Normalize values to mL for
   calculation; use 1 L = 1,000 mL and 1 US gal = 3,785.411784 mL.

Each solution card starts from its current Lotus recipe drop count for the
selected recipe/style. Keep that source count editable so users can adapt a
recipe without changing the Lotus defaults. Scale each solution independently
using the same reference and target water volumes:

```text
scaledDropsExact =
  editableRecipeDrops * targetWaterVolumeMl / referenceWaterVolumeMl
```

The selected tip style continues to determine the recipe's Round or Straight
drop counts and the matching shared calibration. Changing water volume must
not change the solution's recipe proportions or the salt chemistry model.

### Results and rounding

For each solution, show:

- The editable source recipe drop count.
- The calculated fractional drop count for the target volume.
- The nearest whole-drop count as the practical dose.

Use the unrounded calculation for display and round the actionable count to the
nearest integer. Do not hide small values that round to zero; the fractional
result must remain visible so users can see the effect of rounding.

### State and migration

- Store one calibration record per tip style, using the existing DIY input
  persistence path.
- Keep the selected target volume, reference-volume edits, and per-card recipe
  count edits in the Lotus page's working state, following the existing
  behavior of other temporary Lotus controls.
- Migrate valid legacy per-dropper measurements to the shared style record:
  - If exactly one valid measurement exists for a style, use it.
  - If multiple valid measurements for a style agree, use the common value.
  - If valid measurements disagree, preserve the legacy values and require the
    user to choose which measurement becomes the shared value. Do not silently
    select or discard a conflicting measurement.
  - If a style has no valid legacy measurement, leave it uncalibrated and use
    the labeled nominal estimate until the user calibrates it.

## Validation and empty states

- Require positive finite reference and target water volumes before showing a
  scaled result.
- Allow a source recipe count of zero; that solution's scaled dose remains
  zero.
- Do not show a calculated dose for invalid or incomplete source counts.
- Keep nominal and calibrated rates distinguishable in the UI.
- Explain that a shared rate assumes all droppers of the same Lotus tip style
  use the same drops-per-mL measurement.

## Testing and verification

Add or update tests to verify:

- One Round calibration is applied to every Round solution card, and one
  Straight calibration is applied to every Straight solution card.
- Updating a style calibration updates all cards using that style without
  changing the other style's calibration.
- Missing calibrations use the existing nominal rate and are labeled as
  estimates.
- The Lotus recipe's default drop counts and the 450 mL reference basis are
  prefilled, and user edits are used in scaling.
- mL, L, and US gallon conversions produce equivalent results.
- Scaling follows the stated formula for increases and decreases in water
  volume.
- Fractional results are shown alongside nearest-whole-drop doses, including
  results that round to zero.
- Legacy calibration migration handles single, identical, conflicting, and
  absent measurements without silently losing a user's existing values.
- Invalid and zero volume inputs do not produce misleading results.

Run focused Lotus tests, the calculator typecheck and production build, restart
the web workflow, and verify the Lotus page in the preview.

## Non-goals

- Do not add a ppm calculator or dry-salt batch calculator.
- Do not infer brew-water volume from finished-cup mass or yield.
- Do not replace the Lotus recipe defaults or alter the chemistry engine.
- Do not add per-card calibration overrides.
- Do not change the standalone Concentrate workflows or other calculator
  modes.