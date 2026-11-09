# Lotus Recipe Dosing for DIY Stocks

## Goal

Adapt Lotus Coffee Products’ published recipes for Watermancer’s DIY Lotus
stocks. For a selected published recipe and brew-water volume, show how many
drops of each DIY stock to add, using the user’s selected tip calibration and
the stock strengths produced by Watermancer’s existing preparation math.

This is an estimate for Watermancer’s modeled stocks, not a copy of Lotus’s
calculator or a claim to reproduce its undisclosed commercial concentrate
formulas.

## Source and existing behavior

The official [Lotus product instructions](https://lotuscoffeeproducts.com/pages/product-instructions)
publish these seven presets:

- Light and Bright
- Simple and Sweet
- Light and Bright (espresso)
- Simple and Sweet (espresso)
- Bright and Juicy
- Rao’s Recipe
- Ultra Light

The app already stores these recipe inputs and derives their ion targets. The
DIY Lotus Drops page already has a brew-volume slider, selected Round/Straight
tip style, shared water-drop calibration, and a single-salt stock preparation
card.

Lotus does not publish its exact commercial concentrate strengths. The app’s
salt-to-water stock ratios are therefore modeled estimates based on public
recipe and drop data. The calculator must identify the output as an
extrapolation.

## User experience

- Keep the existing Lotus dropper selection, calibration, volume slider, and
  weight-based preparation unchanged.
- Add a collapsed section below the weight-based preparation card. Its concise
  title should make clear that it doses a published recipe into brew water.
- When expanded, show a recipe picker with the seven official presets. Do not
  preselect a recipe; show the dose rows after the user chooses one.
- Show one compact row for each recipe stock: Magnesium, Calcium, Potassium,
  and Sodium. Each row displays a whole-drop count for the current brew-water
  volume.
- Reuse the existing selected brew-water volume and selected tip style. Do not
  add duplicate volume or tip controls.
- Use the selected style’s saved calibration when available. If it is missing,
  use the app’s nominal style rate and visibly label the counts as estimated.
- Include a short disclosure that these are Watermancer estimates for its DIY
  stocks, plus a link to Lotus’s published instructions.
- Keep Bonus Epsom out of these presets; it is not one of Lotus’s four recipe
  stocks.

## Calculation

For each preset:

1. Derive the published recipe’s exact target ion values from its stored Lotus
   inputs, using the existing Lotus ion conversion.
2. For each corresponding DIY stock, use the salt and hydration form already
   used by the stock-preparation plan. Derive salt mg per gram of finished
   stock from the plan, then estimate salt mass per drop using the selected
   tip’s measured water grams per drop. Use the nominal style rate only when
   calibration is absent; this retains the app’s water-density approximation.
   Apply the selected salt form’s cation fraction to get ion mg per drop.
3. Calculate required drops as:

   `round(target ion mg/L × brew-water liters ÷ DIY stock ion mg per drop)`

4. Recompute when the recipe, shared volume, tip style, calibration, or stock
   plan changes.

The current stock-preparation workflow keeps the same salt-to-finished-mass
ratio while scaling batch size. Therefore changing only the batch size does
not change that stock’s strength or its recipe drop count. Drop counts are
rounded to whole drops. They remain estimates because the finished DIY stock’s
drop mass is approximated from water calibration rather than measured directly.

Do not change the existing DIY stock recipe, Lotus reference calculations, or
shared-calibration behavior.

## State and compatibility

- No API, database, migration, or new persistent user setting is needed.
- Existing saved calibrations and DIY stock inputs remain the source of truth.
- The recipe selector is local UI state; it does not overwrite the calculator’s
  water target or salt-dose selections.
- The recipe area is closed on initial page load.

## Verification

- Verify the seven preset names and source URL against the official instructions.
- Verify nominal-rate output against existing published Lotus dose calculations
  at the default 450 mL volume.
- Verify counts scale with brew volume and with calibrated drops per milliliter.
- Verify each DIY stock’s modeled strength is used, and that changing only its
  batch size leaves the per-drop strength unchanged.
- Verify uncalibrated output uses the nominal rate and is labeled as an
  estimate.
- Verify the panel starts collapsed, opens accessibly, and recalculates after
  changing the shared volume or selected calibration.
- Run the calculator’s unit tests, typecheck, production build, and focused
  browser tests for the Lotus workflow.
