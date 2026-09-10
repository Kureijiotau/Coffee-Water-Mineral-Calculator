# Watermancer → Concentrate Handoff

## Goal

When a user sends a recipe from Watermancer to Concentrate, the concentrate builder must use the live Watermancer salt route, including edited physical-dose overrides, rather than the stale calculator salt table. Saved preparation cards must also avoid exposing raw floating-point strength values.

## Design

- Keep the existing `ConcentrateRecipeHandoff` shape and final-water volume behavior.
- Build handoff salt entries from `activeWatermancerSaltTargets` when Watermancer is active. This route already includes selected salts, hydration forms, current volume conversion, and fixed dose overrides.
- Continue building ordinary Alchemist/Brewer handoffs from the visible salt rows.
- Preserve target precision for chemistry calculations; only format user-facing strength labels and initial strength input values to two meaningful decimal places.
- Apply the formatting consistently to the modeled ceiling, stock-strength input initialization, safety copy, and saved recipe-card text.

## Data flow

1. Watermancer computes the active route from its selected salts and dose overrides.
2. The handoff converts those live targets into `SaltRecipeEntry` values using the current row hydration forms.
3. Concentrate computes bottle salt mass from the handoff targets, hydration molar masses, bottle volume, and selected strength.
4. The card renders formatted strength values while retaining full numeric precision for mass and dose calculations.

## Error handling

- If the selected/live handoff has no positive salt targets, retain the existing alert and do not navigate.
- Invalid or non-finite strength values continue to render as the existing em dash/zero-safe fallbacks.

## Testing

- Add a pure helper test proving live target maps override visible row targets while hydration forms are retained.
- Keep existing concentrate chemistry tests unchanged.
- Run typecheck, the full unit suite, and the production build.