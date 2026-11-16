# GH/KH and Salt Units Explainer Design

## Goal

Help users understand how salts separate into ions, which ions contribute to GH and KH, and what mg, mg/L, and ppm mean, without changing any recipe calculations.

## User problem

The salt recipe summary presents GH and KH as ppm CaCO₃, while recipe rows use salt targets and direct doses. Users may mistake a salt's ppm or mg amount for the GH or KH it produces—for example, assuming 40 ppm magnesium chloride means 40 GH. They also need to see how a salt's mass is divided among its ions and how ppm relates to mg/L.

## Approved design

Keep the small **How it works** control in the existing Salt Recipe Summary / Base Salt Recipe Summary header in Brewer and Alchemist. It opens a three-step illustrated guide in the focused, dimmed modal with Back, Next, and Close controls. The guide opens only on request and does not change the underlying recipe.

The guide uses static, rounded examples that are independent of the selected recipe, selected hydration forms, and brew volume. Salt examples and ion labels use the app's existing color coding. Do not calculate or display live recipe values.

## Explanation sequence

1. **Salt to ions:** Show rounded 1 L examples for magnesium chloride, calcium chloride, magnesium sulfate, sodium bicarbonate, potassium bicarbonate, and sodium chloride. Show the approximate mg/L of each resulting ion, using the app's ion colors. Note that hydrated crystals weigh more than their anhydrous-equivalent salt target because they include crystal water.
2. **GH and KH:** Explain that GH counts calcium and magnesium, while KH counts bicarbonate and carbonate. Show rounded examples: about 10 mg/L magnesium yields about 40 ppm CaCO₃-equivalent GH; about 18 mg/L bicarbonate yields about 15 ppm CaCO₃-equivalent KH. Make clear that sodium, potassium, chloride, sulfate, and other listed ions do not add to either hardness value.
3. **Units:** Distinguish mg (mass), mg/L (concentration per liter), and ppm (approximately mg/L in dilute water). Explain that GH and KH use a CaCO₃-equivalent scale, not salt concentration or literal CaCO₃ mass.

The guide must make clear why 40 mg/L magnesium chloride does not equal 40 ppm GH: only the rounded magnesium portion contributes to GH; chloride contributes to neither GH nor KH. The example values are illustrative, rounded, and independent of recipe inputs.

## Behavior and boundaries

- The explainer appears only in the existing Brewer and Alchemist recipe-summary card; it does not add a Watermancer control.
- Opening, closing, or navigating the explainer never changes recipe inputs, targets, selected forms, saved profiles, or calculation results.
- The guide uses static explanatory values and does not read or update recipe inputs, targets, or calculation results.
- The guide introduces no new chemistry rules, solver behavior, or calculations for recipes.
- Keep the explanation concise and visually secondary to the live recipe summary.

## Accessibility and responsive behavior

- The trigger and all guide controls are keyboard operable and have clear accessible names.
- Announce the current step and its title to assistive technology; maintain predictable focus when the guide opens and closes.
- Ensure diagrams and labels remain readable on narrow screens and do not depend on color alone.

## Acceptance criteria

- Brewer and Alchemist users can open the guide from their existing salt summary; Watermancer remains unchanged.
- The guide explains the difference between salt target, physical weighed mass, ion concentration, and GH/KH expressed as CaCO₃-equivalent.
- All six fixed salt examples and their rounded ion contributions are visible regardless of selected recipe.
- Changing the active recipe, a salt amount, a hydration form, or brew volume does not change the guide examples.
- GH and KH contributions are attributed to the correct modeled ions; chloride and sulfate are never presented as GH/KH contributors.
- The TDS note remains distinct from GH/KH.
- No existing recipe or solver result changes.
