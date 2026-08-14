# Unified Mineral Recipe Selector

## Goal

Use one grouped recipe selector in the Alchemist mineral recipe card instead
of separate selectors for mineral recipes and Watering Hole recipes.

## Design

Replace the two existing controls with one selector styled like Watermancer's
target-profile selector:

- `Custom` as the top-level option.
- A `Built-in` group for bundled mineral recipes.
- A `My recipes` group when saved recipes exist.
- A `Robert Asami’s Watering Hole` group for external recipes.

The selector uses the existing recipe IDs and applies the appropriate handler:
`applyRecipe` for built-in/saved/custom values and `applyExternalRecipe` for
Watering Hole values. Existing save, delete, share, import, reset, and
Concentrate handoff actions remain unchanged.

## Non-goals

- Do not change recipe data or recipe calculations.
- Do not change Watermancer's selector.
- Do not remove any recipe source or saved-recipe functionality.

## Verification

Run the existing test suite, typecheck, production build, `git diff --check`,
restart the web workflow, and verify the preview loads cleanly.