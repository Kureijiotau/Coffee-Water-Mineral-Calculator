# Lotus Shared Dropper Calibration

## Goal

Let users calibrate Lotus dropper behavior once per tip style and reuse that
measurement for every Lotus solution card of the active style. Users should not
have to repeat identical calibration inputs on each card.

This change is limited to the Lotus calibrator. It does not add the proposed
brew-volume drop scaler.

## Existing behavior and constraints

- The Lotus page has separate Round and Straight tip styles and a nominal
  conversion model between them.
- The active style is effectively shared across the Lotus cards, although
  style controls are currently repeated in the cards.
- Calibration inputs are currently stored per dropper card as a number of
  drops and a water weight.
- The existing DIY input storage path persists Lotus calibration values and is
  used by account-sync storage.
- Each solution card remains an independent stock plan. A shared calibration
  changes only its dropper-rate input; it must not combine the stocks or change
  recipe chemistry.

## Product behavior

### Shared calibration controls

Move the calibration inputs into one shared Lotus calibration area above the
solution cards. Provide separate Round and Straight calibration records. Each
record contains:

- Measured number of drops.
- Measured water weight in grams.
- The resulting drops-per-mL rate, treating 1 g of water as 1 mL.

Keep one active tip-style selection for the Lotus page. The selected style's
shared rate is used by all solution cards. The other style's calibration
remains saved and can be selected without re-entering its values. Remove the
duplicated per-card calibration fields and repeated style controls; retain
card-specific stock volume and recipe information.

When the selected style has a valid measurement, use its measured rate for all
cards. If it has no complete valid measurement, use the existing nominal
style model and label the rate as an estimate. Do not present an incomplete
measurement as calibrated.

### Persistence and legacy values

Persist shared calibrations by tip style through the existing DIY input storage
path so current persistence and account-sync behavior continue to work.

Migrate existing per-dropper values without silently discarding user data:

- If a style has one complete valid legacy calibration, promote it to that
  style's shared record.
- If multiple complete measurements for a style are identical, promote the
  common value.
- If complete measurements disagree, show an inline resolution state listing
  the source card and values. Do not apply a disputed value as calibrated
  until the user chooses which one becomes the shared record; use the labeled
  nominal estimate meanwhile.
- If a legacy record has no style association, require the user to assign it to
  Round or Straight before promoting it; do not infer the style silently.
- If no complete legacy measurement exists but a partial record does, preserve
  its entered values so the user can finish the measurement. Do not treat a
  partial pair as calibrated.
- If a style has no complete valid measurement, leave it uncalibrated and use
  the labeled nominal estimate.
- Preserve unresolved or incomplete legacy entries until the user resolves or
  replaces them.

## Validation

- A calibration is valid only when both inputs are finite and greater than
  zero.
- Do not display an incomplete or invalid pair as a measured rate; use the
  labeled nominal estimate until both fields form a valid measurement.
- If no valid calibration is available for the selected style, clearly label
  the nominal rate as an estimate.
- Explain that each shared rate assumes all Lotus droppers using that tip style
  have the same drops-per-mL behavior.

## Testing and verification

Add or update tests to verify:

- A Round calibration is used by every Lotus solution card when Round is
  active; the equivalent holds for Straight.
- Editing one style's calibration updates all cards using that style and leaves
  the other style's saved calibration unchanged.
- Switching styles selects the other saved calibration without copying or
  overwriting the first.
- Missing, incomplete, zero, negative, and non-finite measurements do not
  appear as valid calibrations and use a clearly labeled nominal estimate.
- Legacy migration handles a single measurement, identical measurements,
  conflicting measurements, and no valid measurements without silently
  discarding user values.
- Existing DIY storage and account-sync tests continue to preserve calibration
  values.
- Card-specific concentrate volumes and salt masses remain independent of
  which card's former calibration fields were entered.

Run focused Lotus and account-sync tests, the calculator typecheck and
production build, restart the web workflow, and verify the Lotus page in the
preview.

## Non-goals

- Do not implement the brew-volume drop scaler or add target-water controls.
- Do not change published Lotus recipes, nominal style factors, or salt
  chemistry.
- Do not add per-card calibration overrides.
- Do not change the standalone Concentrate workflows or other calculator
  modes.