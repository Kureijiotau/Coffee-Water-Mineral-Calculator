# Watermancer silica drop row

## Goal

Let users add Eidon Ionic Minerals Silica to a Watermancer batch using whole-drop controls, while showing the product's silica mass accurately.

## Label basis

The supplied Supplement Facts state 375 mg of silica (as silicon dioxide) per 30 drops (2 mL). Use 12.5 mg SiO₂ per drop. Calculate the selected dose as `dropCount × 12.5 mg`; calculate the batch concentration as dose divided by final batch volume in liters.

## Design

- Add a dedicated Silica (SiO₂) supplemental row to the Watermancer salts table.
- The row starts at zero drops. Its minus and plus controls decrement or increment by exactly one drop, never below zero.
- Show the integer drop count, total SiO₂ dose in mg, and dose concentration in mg/L for the current batch volume.
- Add silica to the supplemental final-mixture readings as a display-only component. Show it only when its dose is above zero, matching the existing conditional display behavior for supplemental/citrate readings.
- Include the silica drop count and total SiO₂ mass in both the on-screen Recipe steps card and its downloadable image.
- Keep the silica addition separate from the modeled ionic salts. It must not affect target-ion matching, GH, KH, or the solver's selected-salt optimization.
- Preserve the drop count when capturing and restoring a Watermancer session snapshot. Older snapshots without the value restore to zero.

## Interaction and accessibility

- Provide descriptive accessible labels for the decrement and increment controls, including the one-drop step.
- Disable the decrement control at zero. Update the displayed mass and concentration immediately after a step or batch-volume change.

## Verification

- Test the 12.5 mg-per-drop conversion, zero floor, and batch-volume concentration calculation.
- Verify silica is absent from final readings at zero drops and appears with the correct mg/L value when added.
- Verify the on-screen and downloadable Recipe steps cards show the same drop count and total mg.
- Verify session snapshot capture and restoration, including snapshots created before the field existed.
- Confirm adding silica does not alter modeled ions, GH/KH, or matcher results.
- Run the app's tests, typecheck, and production build.

## Scope

Watermancer only. The Alchemist table, core ion catalog, solver chemistry, and `.WATER` ion-profile exports remain unchanged.