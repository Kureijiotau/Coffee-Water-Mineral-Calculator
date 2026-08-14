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
  - the selected concentrate strategy (GH + KH, All-in-one, or Separate
    salts);
  - the current shared concentrate strength;
  - a separate concentrate-volume card listing every active concentrate and
    its current editable volume;
  - the max-safe-strength reminder when available;
  - a single dosing reference card with a button that swaps between 1 L and
    1 US gallon, showing both mL and drops.
- Dosing uses the current recipe strength and the app’s calibrated drops-per-mL
  value. The listed dose is the amount to add from **each prepared
  concentrate**.
- Strategy, strength, and concentrate-volume values update in the guide while
  the workspace remains open; the guide never substitutes default values for
  the user’s active card inputs.
- Without a recipe handoff, the card provides general concentrate preparation
  guidance and explains how to return to the Calculator for recipe-specific
  amounts.

## Data flow

`RecipeConcentrateBuilder` continues to own its calculation state, but reports
a small live plan snapshot to `ConcentrateWorkspace`. The snapshot contains
the selected strategy, strength, max-safe strength, group identifiers, and
current volume for each group. The workspace passes that snapshot, the recipe
handoff, and the calibrated drops-per-mL value to the new steps card. Existing
stock/group calculations remain unchanged.

## Verification

Run tests, typecheck, production build, diff check, workflow restart, and
preview verification.