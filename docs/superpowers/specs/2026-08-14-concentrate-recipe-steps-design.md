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
  - both 1 L and 1 US gallon dosing references, showing mL and drops.
- The preparation-instruction checklist is not part of the Recipe steps card;
  the card is a compact recipe and dosing reference.
- A **Save JPG** button at the top exports the clean recipe card without the
  modal backdrop or export controls.
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

The modal keeps a ref to the exportable card surface and uses the app’s
existing `html2canvas` dependency to create a high-resolution JPEG. Export
controls are excluded from the captured surface, and a temporary saved state
provides feedback without changing recipe data.

## Verification

Run tests, typecheck, production build, diff check, workflow restart, and
preview verification.