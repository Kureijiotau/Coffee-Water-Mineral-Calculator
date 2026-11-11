# Editable recipe-concentrate dose

## Goal

Let users choose the finished concentrate mass to dose for the currently selected
brew-water amount, then calculate the stock strength needed to deliver the
existing recipe target. Warn when that strength exceeds Watermancer's modeled
stock safety limit and recommend a dose that keeps the target while using a
safer, weaker stock.

## Scope and interaction

- Add the editable control inline in the recipe-concentrate dose result card,
  using the sentence “Dose [amount] g stock for [volume] L brewing water.”
  Keep DIY single-salt and Lotus-specific workflows unchanged.
- The editable amount is total stock grams for the currently selected brew
  water. Initialize it from the current stock strength, finished stock mass,
  and brew-water mass. Do not show a separate editable g/L value.
- A valid positive edit is divided by the current brew-water mass to derive the
  g/L dose used by the existing strength calculation. This recalculates recipe
  strength while preserving the recipe's ion target; preparation masses, dose
  details, and per-drop outputs update from that strength.
- Keep total finished stock mass as a separate weight-based preparation input.
  No concentrate-volume math is introduced.
- When the user changes finished stock weight, keep the selected total stock
  grams for the current brew-water amount and recalculate strength to preserve
  the recipe target, unless an existing pinned per-drop target is active. A
  per-drop pin keeps its current priority until the user explicitly edits the
  displayed dose, which clears the conflicting pin.
- Changing the brew-water amount scales the displayed total dose while retaining
  the resulting recipe strength.
- Invalid or blank input remains editable but must not apply invalid strength to
  the saved stock plan.

## Safety behavior

- Run the existing modeled solubility and precipitation checks against the
  strength implied by the entered dose.
- If the implied stock strength is above the existing conservative safe
  recommendation, preserve the user's entry and show a warning. Do not silently
  alter the target or dose.
- Show the conservative maximum recommended stock strength and the corresponding
  minimum grams per liter and total grams for the current brew amount needed to
  preserve the recipe target at that strength. Fewer grams require a stronger
  stock, so the safer alternative is a larger dose.
- If the current stock setup has no conservative safe-strength recommendation,
  say no safe grams-per-liter recommendation is available for that setup; do
  not invent a value.
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
- UI tests cover the inline total-grams value, editing for the current brew-water
  amount, updated preparation/dose output, and an unsafe entry with a safer
  grams-per-liter and current-brew recommendation.
- Existing concentrate, Lotus, and calculator checks continue to pass.
