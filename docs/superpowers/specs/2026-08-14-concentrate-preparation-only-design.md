# Concentrate Preparation-Only Workspace

## Goal

Make the Concentrate tab a preparation workspace only. Users should be able
to build and calibrate concentrates there, without recipe browsing or
recipe-specific dosing tables in that tab.

## Scope

Keep the existing two nested Concentrate modes:

- **Stock Builder** for creating a calibrated single-mineral concentrate.
- **DIY Lotus Drops** for preparing the four independent mineral droppers.

The **DIY Lotus Drops** name remains visible. Its source attribution and
independence disclosure remain visible, but its recipe selector, recipe dosing
summary, and recipe matrix are removed from the Concentrate tab.

Recipe presets and recipe calculations in Brewer, Alchemist, and Watermancer
remain unchanged. Existing Calculator-to-Concentrate handoffs continue to
open Stock Builder so users can still prepare a concentrate from a selected
recipe outside the Concentrate tab.

## Implementation

1. Remove the recipe-specific section from the DIY Lotus Drops view.
2. Keep the four dropper preparation cards, style control, bottle calculations,
   calibration controls, source assumptions, and weight-first instructions.
3. Update the Concentrate workspace copy so it describes concentrate
   preparation rather than recipe handoffs or recipe selection.
4. Remove only state/imports that become unused because the recipe section is
   gone; preserve shared Lotus recipe data used by Watermancer and other
   workspaces.

## Testing

- Confirm the Concentrate tab renders both preparation modes.
- Confirm “DIY Lotus Drops” remains the nested tab label.
- Confirm recipe selectors and recipe tables are absent from the Concentrate
  tab while recipe presets remain available elsewhere.
- Run the full Vitest suite, typecheck, production build, `git diff --check`,
  workflow restart, and preview verification.

## Non-goals

- Do not remove Lotus source data or Watermancer Lotus ion presets.
- Do not change the chemistry formulas or four-dropper calculations.
- Do not alter Brewer, Alchemist, Watermancer, or shared recipe handoffs.