# Recipe card: lactate and citrate

## Goal

Show lactate and citrate in the recipe card's mineral analysis when the recipe contributes them.

## Current behavior

The recipe card includes the core ion readings and conditionally shows nonzero active ions as “Other modeled ions.” Citrate is already included there. Lactate is a supplemental ion, so it is not part of the card's current ion list, even when a recipe salt contributes it.

## Design

- Keep citrate conditional on its finished-water concentration, retaining the current “Other modeled ions” presentation.
- Add lactate as a conditional supplemental-ion row, calculated from the recipe's actual salt targets. Use the existing card threshold so values that would display as `0.0 mg/L` remain hidden.
- Show lactate and citrate in both the on-screen recipe card and its downloaded share image.
- Leave Water Tasting profile analysis, recipe storage/import payloads, and chemistry calculations (including TDS, GH, and KH) unchanged.

## Verification

- Cover positive and zero lactate/citrate values in recipe-card tests.
- Run the focused tests, the calculator test suite, and the calculator build/typecheck.
