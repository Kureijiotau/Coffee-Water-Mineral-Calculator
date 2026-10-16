# Watermancer Guide: Counterion Comparison

## Goal

Add a short explanation below the existing welcome message on Step 1 of the Watermancer Guide. Illustrate that matching GH and KH does not mean two waters contain the same complete set of ions or will necessarily taste the same.

## Approved content and examples

Use two separate recipe-step images, each generated from the existing Recipe Steps card and its current chemistry calculations:

1. **Chloride / sodium recipe:** magnesium chloride hexahydrate, calcium chloride dihydrate, and sodium bicarbonate.
2. **Sulfate / potassium recipe:** magnesium sulfate heptahydrate, calcium sulfate dihydrate (gypsum), and potassium bicarbonate.

Both recipes use 1 L final volume, 0-TDS water, and the same final targets:

- Magnesium: 10 ppm
- Calcium: 20 ppm
- Bicarbonate: 30 ppm
- GH: approximately 91.1 ppm as CaCO₃
- KH: approximately 24.6 ppm as CaCO₃

The cards must show doses and final readings calculated by the app, not manually estimated values. The matched Mg, Ca, and bicarbonate targets keep GH and KH equal. The recipes should differ in their accompanying ions: chloride and sodium in the first; sulfate and potassium in the second.

## Step 1 presentation

Place the section immediately after the welcome paragraph and before the existing step heading. Keep the explanation concise:

> GH and KH don’t show every ion in your water. These recipes have the same magnesium, calcium, bicarbonate, GH, and KH—but different salts add different counterions, which can affect taste.

Show the two cards as separately labeled examples. Display them side by side when space allows and stacked on narrow screens. Give each image descriptive alternative text that identifies its salt combination and notes that its Mg/Ca/bicarbonate targets match the other card.

Do not promise a particular taste outcome or add a new editor, control, or recipe workflow. Do not alter later guide steps, Watermancer matching behavior, salt data, or chemistry calculations.

## Verification

- Confirm the exported cards use the existing Recipe Steps card and real computed salt doses/readings.
- Confirm both cards show the same Mg, Ca, bicarbonate, GH, and KH values, while chloride/sulfate and sodium/potassium differ.
- Confirm the section appears only on Step 1 and remains readable on mobile and desktop.
- Run the relevant tests, typecheck, production build, and `git diff --check`.

## Self-review

- **Placeholders:** None.
- **Consistency:** Each salt pair supplies the same Mg/Ca/HCO₃ targets through different counterions; the comparison does not claim a specific sensory result.
- **Scope:** Limited to Step 1 copy and two recipe-card images.
- **Ambiguity:** Target units are ppm in final water; GH/KH are expressed as ppm CaCO₃ equivalents. Each recipe image represents a 1 L batch made with 0-TDS water.
