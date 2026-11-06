# Lotus Drops single-item, mass-based preparation workflow

## Goal

Make DIY Lotus Drops preparation a focused, one-dropper-at-a-time workflow:
choose the Lotus dropper, confirm or complete calibration for its tip style,
choose a finished stock mass, then prepare that stock.

## Approved direction

- Keep the current Lotus drop and ion calculations unchanged.
- Keep the four Lotus droppers and retain Bonus Epsom as a clearly labeled
  optional extra, not an official Lotus product.
- Use one selected dropper at a time instead of showing all solution cards as
  equal primary tasks.
- Use finished stock mass in grams for batch sizing. The target is salt plus
  water; the bottle is excluded.
- Keep preparation and all stock calculations weight-based. Mention
  mL ≈ g only as a convenience for plain water.

## Product behavior

### Select one dropper

Provide a single selector for Magnesium, Calcium, Potassium, Sodium, and the
optional Bonus Epsom. Show the selected salt and the hydration form already
used by the Lotus estimator as read-only information. Do not add a hydration
form selector or alternate chemistry settings. Keep a Round/Straight tip-style
choice for the selected dropper so the matching shared calibration is explicit.

### Calibration gate

Use the existing shared Round and Straight tip calibrations. The active tip
style's valid saved calibration applies to the selected dropper; do not create
per-mineral calibration values.

- If the selected style has a valid saved calibration, show its calibrated
  status and allow the user to continue. Keep calibration controls available
  for review or correction.
- If that style is not calibrated, show the calibration controls before
  enabling the stock amount and preparation result.
- Calibration determines drops per mL and calibrated per-drop guidance only.
  It must never change the Lotus salt-to-water ratio or the salt mass for a
  given finished stock mass.
- Explain that the calibration weighs plain water and uses the 1 g ≈ 1 mL
  approximation; it is not a direct measurement of finished-stock drop mass.

### Finished stock mass

After calibration, accept one positive, finite target finished stock mass in
grams. Start with no amount selected; require the user to enter it before
showing a preparation result. Treat the target as the total of salt and water,
excluding the bottle. Do not use a stock-volume input or use the target mass as
a water-only amount.

Use the existing Lotus-derived salt-to-water ratio to calculate the physical
salt mass and water mass. Preserve the current salt hydration form and keep
the ratio identical at every batch size. Calibration and tip selection cannot
alter either ingredient mass for the same target.

Keep the existing fixed Lotus-model reference and calibrated per-drop guidance
as compact, read-only secondary information. Include a small, explicit
ion-contribution value in ppm per drop for the selected dropper, based on the
selected style's current calibration and the selected final brewing-water
volume. Add a slider defaulting to 450 mL, with mL, L, and Gal display units,
and a reset button that restores 450 mL and mL units. Use a 50–2000 mL physical
range in 10 mL increments. The source-based Lotus reference and the calibrated
dropper's ppm-per-drop value both scale to the selected final brewing-water
volume; changing calibration affects only the calibrated value. The slider
must not change the published Lotus drop counts, concentrate salt/water masses,
or the underlying source-model ion quantities per drop. Clearly identify Lotus
stock strength as an estimate based on public recipe/drop-weight data; do not
claim to know Lotus's undisclosed stock concentrations or hydration forms.

### Preparation instructions

Show ordered steps for the selected dropper:

1. Place the bottle on the scale and tare it once.
2. Add the calculated salt mass.
3. If salt was weighed on parchment, rinse any clinging crystals into the
   bottle with a splash of the measured water.
4. Add water until the bottle contents (salt + water, bottle excluded) reach
   the target finished mass.
5. Leave headspace for shaking, cap the bottle, and shake until dissolved.

Keep all calculated quantities in grams. Any mL ≈ g note applies only to plain
water, not finished stock.

## Non-goals

- Do not alter Lotus published-recipe inputs, drop-count conversion, style
  factors, ion calculations, or the current source-based salt-ratio estimator.
- Do not add a new salt target, concentration mode, multi-dropper batch, or
  volume-based stock calculation.
- Do not remove Bonus Epsom; keep it visibly distinct from Lotus products.
- Do not change regular recipe concentrates or other calculator modes.

## Acceptance and verification

- Only one dropper is the active preparation target at a time.
- An existing valid tip-style calibration is reused; an uncalibrated selected
  style must be calibrated before the user can continue.
- Existing published-recipe inputs, source drop counts, style conversions,
  fixed Lotus reference values, and ion calculations remain unchanged for all
  droppers and tip styles. Salt/water preparation masses vary with the entered
  total mass while retaining the established ratio.
- The selected dropper shows a compact calibrated ion ppm-per-drop value for
  the selected final brewing-water volume; it updates with the selected tip
  calibration and remains distinct from the Lotus source-model reference.
- The brew-volume slider starts at 450 mL, converts its displayed value between
  mL, L, and Gal without changing the physical volume, and resets to 450 mL.
- Changing brew volume rescales only the displayed per-drop ppm references;
  Lotus recipe drop counts, per-drop source-model ion amounts, and concentrate
  preparation masses remain unchanged.
- Calibration changes per-drop guidance but not salt/water masses for a fixed
  finished stock mass.
- Salt mass plus water mass equals the target finished mass, and the existing
  Lotus salt-to-water ratio is preserved across different batch masses.
- Bonus Epsom remains available as a labeled extra.
- Invalid calibration and stock-mass inputs do not produce misleading
  preparation results.
- Preparation copy follows the ordered salt-first, final-mass workflow.
- Run focused Lotus unit and browser tests, package typecheck and production
  build, restart the web workflow, and verify the Lotus page in Preview.
