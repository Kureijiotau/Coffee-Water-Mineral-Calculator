# Watermancer Strength Scaling — Implementation Plan

## Objective

Implement the approved design in `docs/superpowers/specs/2026-10-03-watermancer-strength-scaling-design.md`.

## Work sequence

1. Add a pure target-scaling helper and unit tests for 0%, 100%, 200%, zero/missing values, and bounded slider values.
2. Add the 0–200% Watermancer strength state and accessible slider beside Watermancer target controls. Keep profile editing and saving on unscaled base values; show effective scaled ceilings in the matching cards.
3. Pass the scaled map through the existing Watermancer plan and every dependent gap, tolerance, review, and metric calculation. Preserve water/salt inputs and manual dose overrides.
4. Include the percentage in WaterPlanSnapshot capture/restore, default old snapshots to 100%, and reset Watermancer to 100%.
5. Add regression coverage for plan signatures, snapshot compatibility, matching modes, and mode isolation.
6. Run relevant tests, type checking, production build, and inspect the running calculator preview.

## Boundaries

- Do not change Alchemist or Brewer target calculations.
- Do not rewrite the selected target source or save scaled values into Watermancer profiles.
- Do not add a second matching implementation or alter selected waters, salts, hydration forms, or fixed doses when the slider moves.