# Simple Mass-Based Concentrate Workflow

## Goal

Make concentrate preparation obvious without alternate stock-target modes or volume-based concentrate calculations.

## Scope

- Simplify the DIY single-salt concentrate workflow and retain its shared dropper calibration.
- When the user opens Concentrates, use the active Brewer, Alchemist, or Watermancer recipe if it contains any positive salt amount; populate Recipe Concentrate from that recipe. If it contains no positive salt amount, open DIY Concentrate.
- Leave the Recipe Concentrate and Lotus Drops preparation workflows otherwise unchanged.
- Do not migrate or reinterpret legacy volume-based stock records.
- Do not delete saved DIY calibration or stock data as a side effect of simplifying the controls.

## Approved behavior

The DIY single-salt flow is presented in this order:

1. Select a salt and its hydration form.
2. Calibrate the Straight and/or Round water-dropper style, then select the tip style used for dosing.
3. Set the total concentrate stock weight in grams and the brewing-batch water amount.
4. Choose either ppm as CaCO₃ or physical salt mg/L per drop, then enter the desired amount.
5. Show direct preparation steps: place the bottle on the scale, tare it, add the calculated salt mass, add water by mass to the target, leave room to shake, then shake until dissolved.

- Remove the DIY “Advanced stock targets” selector and its Recipe target / % w/w controls; the DIY user should not need to choose a separate stock-target model.
- All concentrate calculations and stock sizes remain mass-based. The batch-water field may display liters or gallons, but calculations use the equivalent water mass; a help icon explains that 1 mL of plain water is approximately 1 g. Do not use volume in concentrate math or apply the water equivalence to finished concentrate.
- Keep the mL/g explanation available from a question-mark help control.
- Treat a calibration as valid only when saved drop count and measured water weight are both finite and greater than zero. Saved records remain the source of truth; do not add a completion checkbox.
- Show a checkmark and “Calibrated” when either tip style is valid. Start the shared calibration section open when neither is valid and collapsed on a later open if either is valid. Do not collapse while the user is entering values.
- When only one tip style is calibrated, keep the selected tip’s measured-versus-estimated rate accurate.
- Keep finished-stock calibration attached to its stock composition and tip.

## Data and behavior

Straight- and Round-tip water calibration values already persist in DIY concentrate inputs and synchronize through the existing account-sync path. Saved status is derived from those values at workspace mount. The selected dropper style is a separate dosing choice from the saved per-style calibration values.

The active calculator recipe handoff uses the actual salt amounts for the current mode: Brewer’s active recipe, Alchemist’s current salt targets, or Watermancer’s active route. A zero/empty recipe opens DIY and does not create or overwrite a recipe handoff.

## Verification

- Verify a nonzero recipe in each calculator mode opens Recipe Concentrate with the corresponding salt targets; empty recipes open DIY.
- Verify the DIY interface no longer exposes Advanced stock targets or the Recipe target / % w/w controls.
- Verify salt and hydration selection, shared tip calibration, separate dosing-tip selection, stock weight, batch water, dose-basis choice, dose amount, and preparation steps remain usable.
- Verify the help text limits mL≈g to plain water while all stock preparation math is mass-based.
- Verify preparation steps tare the bottle, add salt before water, include a shake-headspace instruction, and provide a dissolve step.
- Verify no valid tip calibration starts expanded; one valid tip starts collapsed on a later open; incomplete, zero, or invalid values do not count.
- Verify a calibrated tip remains distinguishable from an estimated selected tip.
- Verify recipe/Lotus calibration placement and per-stock calibration behavior remain unchanged.
- Run relevant unit tests, browser tests, typecheck, and production build.
