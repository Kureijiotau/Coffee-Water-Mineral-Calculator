# GH/KH and Salt Units Explainer Design

## Goal

Help Brewer and Alchemist users understand how salt targets and weighed salt amounts produce ion concentrations, GH, and KH, without changing any recipe calculations.

## User problem

The salt recipe summary presents GH and KH as ppm CaCO₃, while recipe rows use salt targets and direct doses. Users may mistake a salt's ppm or mg amount for the GH or KH it produces—for example, assuming 40 ppm magnesium chloride means 40 GH.

## Approved design

Add a small **How it works** control to the existing Salt Recipe Summary / Base Salt Recipe Summary header in Brewer and Alchemist. It opens a four-step illustrated guide in the same visual style as the approved guided tours. The guide has Back, Next, and Close controls, opens only on request, and does not dim or change the underlying recipe.

The guide follows the active recipe and uses its current salt targets, selected hydration forms, and brew volume. Its diagrams and numbers update when those inputs change. Show active salts and their actual modeled ion and GH/KH contributions; do not substitute generic recipe values.

## Explanation sequence

1. **Salt target and weighed mass:** Explain that a salt-row target is an anhydrous-equivalent concentration in ppm (approximately mg/L in dilute water), while the direct dose is the physical mass to weigh. Hydrated forms require a different physical mass to deliver the same anhydrous-equivalent target; total batch volume also changes the weighed dose.
2. **Salt to ions:** Show that each salt contributes ions according to its composition. The selected hydrate changes the physical mass to weigh, not the target ion profile.
3. **Mass per volume:** Distinguish mg, a mass, from mg/L, a concentration. In dilute water, mg/L is commonly treated as approximately ppm. Do not label a whole-batch mg amount as ppm.
4. **GH, KH, and TDS:** Show active recipe contributions by ion. GH is derived from calcium and magnesium; KH is derived from bicarbonate and carbonate. Express GH and KH as ppm CaCO₃-equivalent, not as salt concentration or literal CaCO₃ mass. Chloride and sulfate do not contribute to GH or KH. TDS remains the modeled sum of salt-derived ion concentrations, not the GH/KH equivalent.

The guide must make clear why a magnesium-chloride salt target does not equal the same GH number: only the magnesium-ion portion contributes to GH; the chloride portion contributes to neither GH nor KH. Use the active recipe's actual values and selected forms so this explanation remains tied to the user's current inputs.

## Behavior and boundaries

- The explainer appears only in the existing Brewer and Alchemist recipe-summary card; it does not add a Watermancer control.
- Opening, closing, or navigating the explainer never changes recipe inputs, targets, selected forms, saved profiles, or calculation results.
- The explainer uses the app's existing modeled values and conversions. It introduces no new chemistry rules, solver behavior, or independent calculations for the recipe itself.
- If the recipe has no active salts or no usable brew volume, show a clear empty state in place of derived contribution values; never display stale values from a previous recipe.
- Keep the explanation concise and visually secondary to the live recipe summary.

## Accessibility and responsive behavior

- The trigger and all guide controls are keyboard operable and have clear accessible names.
- Announce the current step and its title to assistive technology; maintain predictable focus when the guide opens and closes.
- Ensure diagrams and labels remain readable on narrow screens and do not depend on color alone.

## Acceptance criteria

- Brewer and Alchemist users can open the guide from their existing salt summary; Watermancer remains unchanged.
- The guide explains the difference between salt target, physical weighed mass, ion concentration, and GH/KH expressed as CaCO₃-equivalent.
- The active recipe's selected forms, salt targets, and batch volume determine the displayed breakdown.
- Changing the active recipe, a salt amount, a hydration form, or brew volume updates the shown values without mutating the recipe.
- GH and KH contributions are attributed to the correct modeled ions; chloride and sulfate are never presented as GH/KH contributors.
- The TDS note remains distinct from GH/KH.
- No existing recipe or solver result changes.
