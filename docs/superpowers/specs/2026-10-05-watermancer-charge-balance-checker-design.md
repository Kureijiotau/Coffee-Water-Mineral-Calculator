# Watermancer Charge-Balance Checker

## Goal

Let users freely choose any Watermancer ion targets, then explicitly run a charge-balance check and optionally apply one suggested single-ion target change. The checker is advisory: it does not constrain editing or change targets unless the user applies a suggestion.

## Design

Place a **Check charge balance** control directly below the Watermancer ion target cards. Do not calculate or enforce balance while the user edits targets. Before the first check, show only a short explanation and the action button. On activation, calculate and show:

- Total positive and negative charge in meq/L.
- Signed difference, defined as positive charge minus negative charge.
- A status for balanced targets, an all-zero target profile, or an imbalance.
- For an imbalance, every valid exact single-ion alternative among the eight active targetable ions: sodium, potassium, magnesium, calcium, chloride, sulfate, bicarbonate, and citrate.

Each alternative changes one target only and shows the ion, current target, and proposed target in ppm. Include increasing a currently zero ion. Do not offer a decrease that would make a target negative. Do not rank or filter alternatives by sensory thresholds, taste, or an assumed preferred ion.

Use the selected target profile's unscaled values (`watermancerIonTargets`), not the strength-scaled display values. Uniform scaling preserves the charge ratio at any nonzero strength; checking the profile basis also avoids treating a 0% strength setting as proof that an otherwise unbalanced profile is balanced. State in the checker that it evaluates the target profile at 100% strength.

Use the existing `ION_CHEMISTRY` molar mass and signed charge metadata. For each ion, derive milliequivalents per liter as:

`meq/L = target_mg_per_L / molar_mass_g_per_mol * abs(charge)`

Sum ions with positive signed charge into the cation total and ions with negative signed charge into the anion total. For a positive difference, valid fixes are increasing one anion or decreasing one existing cation. For a negative difference, valid fixes are increasing one cation or decreasing one existing anion. The single-ion ppm change is the absolute charge difference multiplied by that ion's molar mass and divided by the ion's charge magnitude.

Keep calculation values at full numeric precision; display ppm values to two decimal places and charge totals/difference to three decimal places. Treat an absolute difference at or below `1e-9 meq/L` as balanced to absorb floating-point noise. If every active target is zero, show “No ion targets to check” rather than a balanced result.

Applying an alternative must:

1. Confirm that the suggestion still matches the current target snapshot; if targets or the selected source changed after the check, disable application and ask the user to run the check again.
2. Update only the selected ion in the current target map through the existing Watermancer target-override path. Preserve every other target and the strength percentage.
3. Leave the selected profile/source and any saved profile unchanged. The change remains a current-session override unless the user separately saves it through the existing profile flow.
4. Recalculate the displayed charge result after application. A normal manual target edit remains unrestricted and does not trigger an automatic check.

Explain the scope in the UI: this checks only the eight core targetable ions using the app's configured fixed charges. It does not model non-target supplemental carriers, pH-dependent speciation, source-water or salt availability, solubility, or taste. A balanced target profile is not a guarantee that Watermancer can produce that profile from the selected ingredients.

## Data flow and boundaries

1. Read the current unscaled Watermancer target map and create a stable snapshot when the user runs the check.
2. Calculate cation total, anion total, signed difference, and all valid single-ion alternatives from that snapshot.
3. Render results from the snapshot. Compare the current target map and source with the snapshot to detect stale results.
4. On apply, update one field in the current target map and invoke the existing target-override handler so Watermancer's normal recalculation and manual-mode behavior remain in control.
5. Recompute the check from the resulting target map after a successful apply.

Keep the charge calculation in a small deterministic helper that can be tested without rendering the React application. The target card remains the owner of the checker UI and current result state.

## Verification

- Unit-test charge-equivalent calculations for all eight targetable ions, including divalent and trivalent charges.
- Test zero targets, already-balanced targets, positive and negative imbalances, all-zero targets, and lower-target alternatives that must be omitted to avoid negative values.
- Verify every generated alternative changes exactly one ion and reaches the opposite charge total within floating-point tolerance.
- Verify zero-target counter-ions can be proposed and applied.
- Verify applying a suggestion updates only that target through the existing override path, preserves strength and other targets, does not overwrite a saved profile, and refreshes the result.
- Verify edits or source changes invalidate prior suggestions, while unrestricted manual target editing remains available without running the checker.
- Verify the checker is below the ion target cards, communicates the 100%-strength basis and modeling limits, and remains usable on narrow screens and with keyboard navigation.
- Run relevant calculator tests, type checking, and a production build.