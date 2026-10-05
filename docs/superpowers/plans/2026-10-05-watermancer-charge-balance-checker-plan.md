# Watermancer Charge-Balance Checker — Implementation Plan

## Objective

Implement the approved design in `docs/superpowers/specs/2026-10-05-watermancer-charge-balance-checker-design.md`.

## Work sequence

1. Add a pure charge-balance helper using `ACTIVE_ION_IDS`, `ION_CHEMISTRY`, and the existing meq/L conversion conventions. Return charge totals, signed difference, balanced/all-zero status, and all valid single-ion target alternatives.
2. Add focused unit tests for ion charge conversion, both imbalance directions, zero-target increases, impossible decreases, balanced inputs, all-zero inputs, and the one-ion-only invariant.
3. Add the checker UI below the Watermancer ion target cards. Keep it opt-in, explain the 100%-strength profile basis and model limits, show charge totals and the signed difference, and render every valid recommendation with current and proposed ppm.
4. Capture target values and source when the user runs a check. Detect target/source changes before applying an option; mark stale results and disable stale actions. A strength-only change does not stale the check because calculations use unscaled targets.
5. Apply a chosen correction through the existing Watermancer target-override path, updating only that ion and preserving other targets and strength. Keep draft editing state synchronized if the target card is being edited. Recompute the result after application without saving over a stored profile.
6. Verify the checker remains below the target cards, supports keyboard navigation and narrow layouts, and leaves unrestricted manual editing unchanged.
7. Run the focused tests, the calculator's relevant test suite, type checking, production build, and inspect the running preview.

## Boundaries

- Do not enforce charge balance while editing or change targets without an explicit Apply action.
- Do not include non-target supplemental carriers, pH-dependent speciation, solubility, taste thresholds, or ingredient availability in the calculation.
- Do not change Alchemist/Brewer behavior, the Watermancer target-strength value, saved profiles, selected sources, or solver policy.
- Do not add a second solver or change existing salt/water inputs.