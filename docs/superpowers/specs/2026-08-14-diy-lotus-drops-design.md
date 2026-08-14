# DIY Lotus Drops

## Goal

Add a source-attributed **DIY Lotus Drops** section to the Concentrate workspace
that helps a user reproduce the four-bottle Lotus Water system:

- Magnesium Chloride
- Calcium Chloride
- Potassium Bicarbonate
- Sodium Bicarbonate

The section should calculate a nominal clone from Lotus's public recipe
calculator, show both supported dropper styles, and provide practical
weigh-out instructions for making replacement stocks.

## Source evidence

Authoritative source pages:

- Recipe calculator and named recipe inputs:
  <https://lotuscoffeeproducts.com/pages/product-instructions>
- Product ingredients and bottle size:
  <https://lotuscoffeeproducts.com/products/lotus-water-1>
- Dropper variability and calibration context:
  <https://lotuscoffeeproducts.com/blogs/lotus-blog/precision-brewing-an-exploration-of-dropper-variability-in-making-water-for-coffee>

The product page identifies four 2 oz / 59 mL mineral infusions with the
ingredient pairings above. The instructions calculator publishes the
recipe-specific input values and uses a default 450 mL brew volume. Its
published drop-count model is:

```text
baseVolumeFactor = 450 / 4500
styleFactor(round) = 0.56
styleFactor(straight) = 1.00

Mg drops = round(magnesiumInput * baseVolumeFactor * styleFactor)
Ca drops = round(calciumInput * baseVolumeFactor * styleFactor)
Na drops = round(2 * sodiumInput * baseVolumeFactor * styleFactor)
K drops  = round(2 * potassiumInput * baseVolumeFactor * styleFactor)
```

The same page publishes final ion tables rounded to whole mg/L. The existing
Watermancer Lotus presets remain the canonical source for those final targets.

## Chemistry model

Use the shared salt chemistry engine and the product's four ingredient
identities:

| Dropper | Salt | Default form |
|---|---|---|
| Magnesium | MgCl₂ | Hexahydrate |
| Calcium | CaCl₂ | Dihydrate |
| Potassium | KHCO₃ | Anhydrous |
| Sodium | NaHCO₃ | Anhydrous |

The stock calculator should derive salt mass from the exact source input
profile, the selected nominal drop count, the brew volume, and the user's
measured drops/mL:

```text
ionMgPerDrop = targetIonMgPerL * brewVolumeL / publishedDrops
saltMgPerDrop = ionMgPerDrop / saltIonFraction
saltMgPerMl = saltMgPerDrop * measuredDropsPerMl
batchSaltMass = saltMgPerMl * finalStockVolumeMl
```

When a recipe has zero drops for a mineral, that recipe must not be used to
infer that dropper's concentration. The section will derive one shared
nominal strength per dropper from the Lotus calculator model, then use the
recipe's published drop counts only for dosing instructions.

### Accuracy disclosure

This is an inferred, nominal clone—not a claim that the proprietary commercial
concentrations have been recovered exactly. The public pages expose ingredient
identities, recipe inputs, rounded drop counts, bottle volume, and a relative
dropper-style conversion, but not the manufacturing batch formula or a
guaranteed absolute drop volume. The UI must make this explicit and encourage
calibrating each DIY dropper by measured drops/mL or mass per drop.

The section should preserve both:

1. A source-model nominal calculation based on the Lotus style factors.
2. A user-calibrated calculation that updates stock strength and batch mass.

## UI and interaction

Add a standalone **DIY Lotus Drops** section in the Concentrate tab, without
changing the existing salt-concentrate workflow.

The section contains:

1. **Source and assumptions disclosure**
   - Lotus source links.
   - 450 mL recipe basis.
   - 59 mL bottle default with editable final stock volume.
   - Round and Straight style definitions.
   - Nominal-clone warning.

2. **Dropper style control**
   - Show both Round and Straight calculations.
   - Let the user select a style for the active preparation instructions.
   - Never silently mix the two styles.

3. **Four stock cards**
   - Salt name and formula.
   - Hydration form and editable final stock volume.
   - Nominal and calibrated drops/mL.
   - Required salt mass for the selected bottle volume.
   - Final-volume preparation wording: dissolve in partial water, then top up
     to the measured final volume.
   - Calibration action using the existing dropper-calibration conventions.

4. **Recipe dosing matrix**
   - All seven named Lotus presets.
   - Four drop counts per recipe.
   - Both Round and Straight columns or a clear style toggle.
   - A selected-recipe summary for a 450 mL brew.

5. **Safety**
   - Warn that hydration form changes alter the weighed mass.
   - Warn that dropper and technique changes require recalibration.
   - Keep existing concentrate solubility and compatibility checks available
     where the shared chemistry engine supports them.

## Data flow

Create a focused Lotus concentrate calculation module rather than embedding
formulas in the large application component. It will consume the existing
`LOTUS_RECIPES` source data and shared salt metadata, and expose:

- source-model drop counts by recipe and style;
- nominal stock strength by dropper;
- calibrated stock strength by drops/mL;
- batch salt masses;
- selected-recipe dosing summaries.

Do not add a runtime dependency on Lotus. Keep source URLs and attribution
static in the application.

## Testing and verification

- Test the ingredient-to-salt mapping and default hydration forms.
- Test Round and Straight published drop counts for all seven recipes.
- Test that zero-drop recipe entries do not produce a divide-by-zero result.
- Test stock mass calculations with nominal and calibrated drops/mL.
- Test the Rao's Recipe values against the published 450 mL table.
- Run the full Vitest suite, typecheck, production build, workflow restart,
  and preview check.

## Non-goals

- Do not claim to recover Lotus's proprietary manufacturing formula.
- Do not replace the existing Watermancer target presets.
- Do not alter the existing Brewer, Alchemist, or salt-concentrate behavior.
- Do not create a single mixed stock; the clone remains four independent
  droppers.
- Do not introduce a runtime fetch of Lotus pages.