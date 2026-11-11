# PeakKitchen Built-In Recipes

## Purpose

Add four recipes transcribed from the supplied recipe cards to a clearly labeled `PeakKitchen` built-in section. Selecting a recipe should load the listed salt targets and hydration forms into the existing Brewer, Alchemist, and Watermancer recipe workflows.

## Recipe basis and names

Treat each pictured salt mass as the physical hydrated-salt amount for a 1 L finished-water recipe. The existing recipe model stores anhydrous-equivalent mg/L, so convert each pictured amount using `anhydrous-equivalent target = physical mass × anhydrous molar mass ÷ selected hydrate molar mass` and preserve the matching hydration form. The calculator's physical-dose display must then reproduce the pictured amount for 1 L.

Preserve the pictured recipe names requested by the user:

- **Club Soda** (formerly Tonik)
- **Jelly** (formerly Jamm)
- **Lily** (formerly Lylac)
- **Conflate** (formerly Konflux)

Use the pictured hydration forms: magnesium chloride hexahydrate, calcium chloride dihydrate, magnesium sulfate heptahydrate (Epsom), and anhydrous potassium chloride, sodium chloride, sodium bicarbonate, and potassium bicarbonate.

## Recipe contents

| Recipe | Physical amounts from the card per 1 L |
| --- | --- |
| Club Soda | 3,300 mg MgCl₂·6H₂O (1,545 target); 770 mg CaCl₂·2H₂O (581 target); 440 mg NaCl; 150 mg NaHCO₃; 110 mg KHCO₃ |
| Jelly | 1,750 mg MgCl₂·6H₂O (820 target); 890 mg CaCl₂·2H₂O (672 target); 560 mg KCl; 250 mg KHCO₃; 230 mg NaHCO₃ |
| Lily | 2,200 mg MgSO₄·7H₂O (1,074 target); 1,300 mg MgCl₂·6H₂O (609 target); 630 mg KCl; 300 mg KHCO₃; 250 mg NaHCO₃; 100 mg NaCl |
| Conflate | 1,050 mg CaCl₂·2H₂O (793 target); 700 mg KCl; 600 mg NaCl; 200 mg KHCO₃; 150 mg NaHCO₃; 20 colloidal silica drops per 1 L |

Parenthetical targets are the app's anhydrous-equivalent mg/L values shown on the cards; other listed salts are anhydrous and their target equals the pictured mg/L amount.

The silica reference uses the supplied card's basis of 12.5 mg per drop, or 250 mg/L. Show the Conflate silica instruction as a separate preparation item, not as a mineral salt or modeled ion. When Conflate is selected as a Watermancer target, set the silica target to 250 ppm so the existing Watermancer control can scale its drop count with the selected batch volume; at 1 L it displays 20 drops. Brewer and Alchemist show the same per-liter preparation guidance without changing their modeled salt-ion targets.

## Catalog behavior

- Show the four recipes together under a `PeakKitchen` built-in subsection in the shared salt-recipe pickers used by Brewer, Alchemist, and Watermancer.
- Keep their salt targets and hydration forms identical wherever selected.
- Keep Conflate silica visible in recipe preparation guidance, separate from the salt list and core-ion calculations.
- Selecting a recipe continues to use the existing recipe-selection behavior; do not add a new stock-preparation workflow or change solver chemistry.
- Record the provided card values as the recipe data. Do not claim an external publication or add a source URL that was not supplied.

## Verification

- Tests assert all four recipe names, salt IDs, anhydrous-equivalent targets, and hydration forms; at 1 L, calculated physical amounts must match the pictured hydrated-salt masses.
- Tests assert the PeakKitchen picker group exposes exactly the four requested recipe options.
- Tests assert Conflate carries the 250 ppm silica target basis and yields 20 drops for 1 L through the existing Watermancer silica conversion.
- Run the relevant recipe and Watermancer silica tests, typecheck, and the existing app verification appropriate to the changed picker paths.

## Out of scope

- Changing any under-the-hood ion or salt calculation.
- Creating or editing concentrate stocks from these recipes.
- Importing or linking to an official PeakKitchen website.
- Changing other built-in recipe groups or recipe names.
