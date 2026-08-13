# All-in-one concentrate design

## Goal

Replace the Alchemist “Preparation route” toggle with an “All-in-one concentrate”
toggle that creates the strongest practical single-bottle concentrate supported by
the calculator’s existing safety model. Make the preparation order prominent in
Recipe steps so users reduce local precipitation risk while mixing.

## Scope

This change applies to the Alchemist calculator workflow only. Existing dry-salt
preparation, split-stock mode, standalone Concentrate mode, recipe serialization,
and manual concentrate controls remain available.

## User experience

### Toggle activation

The visible control is labeled **All-in-one concentrate**. When enabled:

- All active salt targets remain unchanged.
- Split-stock mode is disabled because this route means one bottle.
- Stock volume is initialized to **100 mL**.
- Stock strength is initialized to the strongest safe integer multiplier.
- Existing manual edits are not overwritten after activation.

The shared recipe scaling is preserved: every salt uses the same multiplier and
the same 100 mL stock volume.

### Strongest safe strength

Use the existing `checkConcentrate` safety model against the complete active salt
target map. Find the highest integer multiplier up to the existing practical
ceiling of **500×** for which there are no `error` or `warning` results.
Informational precision notices do not disqualify a strength.

If no useful multiplier above 1× is safe, use 1× and retain a clear warning that
the recipe is not practical as a strong all-in-one concentrate.

The search logic should be a small pure helper with deterministic inputs and
outputs. It must not alter salt targets or hydration forms.

### Safety warning and redirect

If the current all-in-one strength has any safety `error` or `warning`—including
one created after the user edits the recipe or manually changes the strength:

- Keep the current values visible.
- Show the existing warning details and limiting salt/reaction.
- Show an **Open Concentrate workspace** action.
- Use the existing recipe handoff so the current salt targets, hydration forms,
  recipe name, and batch volume arrive in the Concentrate workspace.

The handoff should not silently discard the current recipe.

## Recipe steps emphasis

Recipe steps already receive the concentrate state. When all-in-one concentrate
is active, make the mineral-mixing step visually prominent and explain:

1. Start with only part of the final stock water.
2. Add one salt at a time.
3. Stir until each salt is fully dissolved before adding the next.
4. Use this order:
   - sulfate salts
   - chloride salts
   - other salts
   - bicarbonate/carbonate salts last
5. Top up to the final stock volume only after all salts are dissolved.

The bicarbonate/carbonate portion gets an additional precipitation-risk note.
If the safety engine produced a cap or warning, surface that warning beside the
mixing order. The guidance must avoid claiming that order alone guarantees
solubility; the safety calculation remains authoritative.

Dry-salt and dropper Recipe steps retain their existing appearance and order.

## Implementation boundaries

- Keep `concentrateOn` as the internal state if that avoids unrelated
  serialization changes; update its user-facing language and activation behavior.
- Add the strongest-safe-strength helper beside the existing concentrate safety
  logic, preferably in `waterData.ts` so it shares the same model.
- Reuse `handleSendRecipeToConcentrate` for the redirect action.
- Pass the existing concentrate state into the Recipe steps component and use it
  only to select the emphasized all-in-one presentation and ordering.

## Testing

Add focused tests for:

- A recipe with no modeled limiting reaction reaching the 500× ceiling.
- Per-salt solubility capping the selected multiplier.
- Reactive-pair warning capping the selected multiplier.
- Informational precision notices not lowering the multiplier.
- Empty or invalid targets producing a safe deterministic fallback.
- All-in-one activation defaulting to 100 mL and disabling split mode.
- The safety warning exposing the Concentrate workspace handoff.
- Recipe steps placing bicarbonate/carbonate salts last in emphasized mode.

Run typecheck, the full Vitest suite, production build, workflow restart, and a
live preview check before completion.