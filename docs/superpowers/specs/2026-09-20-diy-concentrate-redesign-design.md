# DIY Concentrate Single-Salt Redesign

## Scope

Revamp the DIY Concentrate tab into a dedicated single-salt concentrate calculator. This workflow must not expose recipe-concentrate concepts such as AIO, stock-strength ceilings, or multi-salt strategy selection.

The existing mineral and hydration-form selection remains the first control block. Existing recipe-concentrate and recipe-card workflows are out of scope.

## User workflow

The UI is organized as four horizontal blocks followed by a preparation guide:

1. **Mineral and hydration form**
   - Keep the existing mineral picker.
   - Keep the existing hydration-form picker.
   - Continue using the selected form's molar mass for physical salt mass.

2. **Concentrate volume and batch volume**
   - Show concentrate bottle volume, default `100 mL`.
   - Show final batch volume, default `1 L`.
   - Bottle volume controls how concentrated the stock is.
   - Final batch volume controls the dose calculation.

3. **Dropper calibration**
   - Replace the current single measured-drops-per-mL field with:
     - measured number of drops
     - measured drop weight in grams
   - Derive drops per mL from the two measurements using the existing water-density approximation.
   - Show the derived weight per drop and drops per mL.
   - Visually emphasize that calibration is important because all dose calculations depend on it.
   - If calibration is incomplete or invalid, show the assumed dropper rate and clearly label it as an assumption.

4. **Desired dose basis**
   - Keep an editable desired CaCO₃-equivalent ppm per drop.
   - Calculate and show how many drops are needed to reach the selected mineral's target for the selected final batch volume.
   - The desired CaCO₃-equivalent ppm/drop is the user-facing dosing target; it determines the required stock strength and salt mass.
   - Do not show or use a strength ceiling in this DIY workflow.

5. **Preparation guide**
   - Explain exactly how much salt to weigh.
   - Explain how much RO/distilled water to add.
   - State that the bottle should be brought to the configured concentrate volume.
   - State the resulting drop dose for the configured final batch volume.
   - Keep the selected hydration form visible in the instructions.

## Calculation behavior

- Preserve the current CaCO₃-equivalent workbook basis for single-salt DIY concentrates.
- Preserve hydration handling: hydration changes physical salt mass, but not the CaCO₃-equivalent target basis or solved stock strength.
- Derive calibration as:
  - grams per drop = measured weight / measured drops
  - drops per mL = 1 / grams per drop
  - invalid or non-positive measurements fall back to the configured dropper assumption.
- Solve stock strength from:
  - selected salt target
  - selected hydration form
  - concentrate volume
  - final batch volume
  - calibrated drops per mL
  - desired CaCO₃-equivalent ppm per drop
- Calculate dose drops from the selected salt's CaCO₃-equivalent target for the final batch volume divided by desired CaCO₃-equivalent ppm per drop.
- Keep exact fractional drops and the corresponding mL value visible; do not silently round one while leaving the other exact.
- Remove the DIY path's current recommendation ceiling and any “recommended ceiling”, “safe ceiling”, “AIO”, or multi-salt strategy labels.

## State and persistence

- Keep the existing DIY mineral/form state and concentrate-plan handoff.
- Extend the concentrate snapshot only as needed to restore the two calibration measurements and the two volume fields.
- Recipe-concentrate snapshots and recipe workflows must retain their existing behavior.
- Switching between minerals or hydration forms must recalculate the salt mass and dose without carrying stale calculated values.

## Validation

Add or update focused tests for:

- drops-per-mL derivation from measured drops and grams
- invalid calibration fallback
- solved single-salt strength from CaCO₃-equivalent ppm/drop
- dose drops for the selected target and final batch volume
- hydration form changing physical salt mass without changing the solved strength
- concentrate volume changing stock mass/concentration while preserving final-water chemistry

Verify with the existing package typecheck, unit tests, production build, and a browser preview of the redesigned DIY tab at desktop and narrow widths.