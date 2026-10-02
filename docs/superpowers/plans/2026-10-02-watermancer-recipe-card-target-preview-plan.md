# Watermancer Recipe-Card Target Preview — Implementation Plan

## Objective

Show the selected Watermancer target-profile ions and matching GH, KH, and TDS
in the recipe-card mineral analysis as a clearly labeled preview when no
modeled mixture ions exist, without changing recipe inputs or import readings.

## Work sequence

1. Separate actual finished-mixture analysis from the values chosen for visual
   display in the Recipe steps modal and share-card image.
2. When Watermancer has no modeled final-mixture ions, use the selected target
   profile for display and label concentrations and derived metrics as a target
   preview. Otherwise keep the existing Current mix analysis.
3. Keep `.WATER.png` embedded finished-water readings and TDS sourced from the
   actual configured mixture; do not use preview values in import metadata.
4. Add regression tests for target-preview values/labels, the live-mixture
   transition, saved-card rendering, and unchanged actual payload readings.
5. Run focused tests, the calculator typecheck and build, and `git diff --check`;
   inspect the running web workflow.

## Boundaries

- Do not create synthetic water or salt steps.
- Leave Alchemist Recipe steps and actual Watermancer mixture calculations
  unchanged.
- Use the same target ion profile and metric semantics as the existing
  Watermancer ratio/metric preview.