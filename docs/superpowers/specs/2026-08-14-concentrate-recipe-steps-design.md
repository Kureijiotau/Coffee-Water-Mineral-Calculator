# Concentrate Recipe Steps

## Goal

Make the Concentrate tab self-contained for users who need to prepare and dose
a recipe concentrate. The tab gets its own Recipe steps button and a dedicated
instruction card rather than reusing the Brewer dry-salt/dropper modal.

## Behavior

- The Concentrate tab always shows a floating **Recipe steps** button.
- The button opens a Concentrate-specific modal card.
- When a recipe handoff exists, the card shows:
  - the current recipe name and active salts with hydration forms;
  - clear preparation steps for every concentrate card;
  - the current shared concentrate strength;
  - the max-safe-strength reminder when available;
  - dosing for 1 L and 1 US gallon in both mL and drops.
- Dosing uses the current recipe strength and the app’s calibrated drops-per-mL
  value. The listed dose is the amount to add from **each prepared
  concentrate**.
- Without a recipe handoff, the card provides general concentrate preparation
  guidance and explains how to return to the Calculator for recipe-specific
  amounts.

## Data flow

`RecipeConcentrateBuilder` continues to own its calculation state, but reports
the current strength to `ConcentrateWorkspace`. The workspace passes that
strength, the recipe handoff, and the calibrated drops-per-mL value to the new
steps card. Existing stock/group calculations remain unchanged.

## Verification

Run tests, typecheck, production build, diff check, workflow restart, and
preview verification.