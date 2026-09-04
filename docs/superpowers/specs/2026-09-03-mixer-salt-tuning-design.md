# Mixer final-blend salt tuning

## Goal

Let users adjust a two-water Mixer blend with mineral salts after the finished
waters have been combined. The Mixer remains a manual blending and tuning
workspace; it does not become a Watermancer target solver.

## Behavior

- Mixer first calculates the existing volume-weighted ion profile from Water A
  and Water B.
- A Watermancer-style salt inventory appears below the source cards.
- Each salt can be marked Used or Not used, given a hydration form, and edited
  as a final-batch dose in milligrams.
- Every dose is applied to the final blended volume. It is not assigned to
  Water A or Water B.
- Final ion readings, GH, KH, GH:KH, and modeled TDS include the salt
  contribution and update immediately.
- No automatic target matching, ratio solver, or hidden salt optimization is
  added.
- The recipe steps and share card list the selected salt doses after the water
  measurements.

## Data and compatibility

- Mixer calculations accept a salt-target map expressed as anhydrous-equivalent
  ppm and hydration-form indexes.
- UI dose fields are physical salt mass in milligrams for the current final
  volume. The calculation converts those doses to canonical targets using the
  selected hydration form.
- Saved Mixer recipes persist the salt targets, hydration forms, and final
  readings.
- Existing saved recipes and imported Mixer cards without salt data load as
  zero-salt blends.
- Existing legacy salt-only imports remain finished-water source snapshots and
  are not reinterpreted as Mixer tuning data.

## Validation

- Unit tests cover salt contribution, hydration-form conversion, zero-salt
  compatibility, and recipe round trips.
- UI tests cover selecting a salt, editing a final dose, recalculation, and
  reset behavior.
- Typecheck, production build, and the calculator workflow must remain clean.