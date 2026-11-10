# Editable recipe-concentrate dose

## Goal

Let users choose the finished concentrate mass to dose per liter of brew water,
then calculate the stock strength needed to deliver the existing recipe target.
Warn when that strength exceeds Watermancer's modeled stock safety limit and
recommend a dose that keeps the target while using a safer, weaker stock.

## Scope and interaction

- Add the editable control only to the recipe-concentrate dose card. Keep DIY
  single-salt and Lotus-specific workflows unchanged.
- Label the control as stock grams per 1 L of brew water. Initialize it from the
  current stock strength and total finished stock mass.
- A valid positive edit recalculates recipe strength from the requested
  grams-per-liter dose, preserving the recipe's ion target. Existing preparation
  masses, dose details, and per-drop outputs update from that strength.
- Keep total finished stock mass as a separate weight-based preparation input.
  No concentrate-volume math is introduced.
- Changing the brew-water amount scales the displayed total dose while retaining
  the selected grams-per-liter setting and resulting recipe strength.
- Invalid or blank input remains editable but must not apply invalid strength to
  the saved stock plan.

## Safety behavior

- Run the existing modeled solubility and precipitation checks against the
  strength implied by the entered dose.
- If the implied stock strength is above the existing conservative safe
  recommendation, preserve the user's entry and show a warning. Do not silently
  alter the target or dose.
- Show the conservative maximum recommended stock strength and the corresponding
  minimum grams per liter needed to preserve the recipe target at that strength.
  Fewer grams per liter require a stronger stock, so the safer alternative is a
  larger dose.
- Continue to treat the checks as modeled estimates, not a laboratory guarantee.
- Existing blocking behavior for unsafe preparation remains in force.

## State and compatibility

- Persist the resulting stock strength through the existing concentrate plan
  state. Do not introduce a separate volume-based field or storage migration.
- Existing recipe selection, hydration forms, calibration, and handoff behavior
  remain unchanged.
- An explicit dose edit clears any pinned per-drop target that conflicts with
  the requested recipe dose.

## Verification

- Unit tests cover dose-to-strength inversion, invalid inputs, proportional
  batch-water scaling, and conservative safe-dose recommendations.
- UI tests cover default value, editing, updated preparation/dose output, and an
  unsafe entry with a higher safe grams-per-liter suggestion.
- Existing concentrate, Lotus, and calculator checks continue to pass.
