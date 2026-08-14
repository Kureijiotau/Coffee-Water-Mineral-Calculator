# Lotus Coffee Products Ion Profiles

## Goal

Add the named Lotus Coffee Products water recipes from the public product-instructions page as selectable Watermancer ion-target presets, grouped separately from the existing Watering Hole recipes.

## Source data

Source: <https://lotuscoffeeproducts.com/pages/product-instructions>

The page publishes recipe-specific dropper input values for magnesium, calcium, potassium, and sodium. Its calculator derives the final ion profile using the following source formulas:

- Magnesium: `ppmmg × 24.305 / 100`
- Calcium: `ppmca × 40.078 / 100`
- Potassium: `2 × ppmk × 39.0983 / 100`
- Sodium: `2 × ppmna × 22.989 / 100`
- Chloride: `2 × ppmmg × 35.453 / 100 + 2 × ppmca × 35.453 / 100`
- Bicarbonate: `2 × ppmna × 61.016 / 100 + 2 × ppmk × 61.016 / 100`

The app will store the resulting final ion targets, while retaining the published input values for traceability. Custom Recipe is not imported because it is not a named preset.

Named presets:

- Light and Bright
- Simple and Sweet
- Light and Bright (espresso)
- Simple and Sweet (espresso)
- Bright and Juicy
- Rao's Recipe
- Ultra Light

## Integration

Create a dedicated `lotusRecipes.ts` data module with a type for source-backed ion profiles. Keep it separate from `ExternalRecipe`, because Lotus publishes final ion targets rather than a salt recipe.

Extend the Watermancer target-source union with a `lotus:<id>` branch. In the Ion Profile dropdown, add:

```text
Lotus Coffee Products
  Light and Bright
  Simple and Sweet
  Light and Bright (espresso)
  Simple and Sweet (espresso)
  Bright and Juicy
  Rao's Recipe
  Ultra Light
```

Selecting a Lotus entry will populate Watermancer's existing ion target state. The existing solver, salt calculations, saved profiles, Watering Hole recipes, Brewer workspace, and Alchemist workspace remain unchanged.

The selected source label and source URL will be handled alongside the existing recipe and reference-water source metadata.

## Testing and verification

- Test that all seven named source presets are present with stable IDs.
- Test the Lotus formula conversion for representative recipes and all six supported target ions.
- Test that the Watermancer source branch returns the selected Lotus ion targets.
- Run the full Vitest suite, typecheck, production build, workflow restart, and preview check.

## Non-goals

- Do not embed the Lotus page or introduce a runtime network dependency.
- Do not convert Lotus ion targets into fabricated salt recipes.
- Do not modify the existing Watering Hole data.
- Do not change the Watermancer solver objective units or existing UI labels outside the new dropdown group.