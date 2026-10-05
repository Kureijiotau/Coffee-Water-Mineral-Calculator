# Watermancer Standalone Custom Ion Ratio — Implementation Plan

## Objective

Implement the approved design in `docs/superpowers/specs/2026-10-05-watermancer-custom-ion-ratio-design.md`.

## Work sequence

1. Add a small pure helper for the eight-ion cycling order, next-ion selection that skips the opposite side, and left/right ratio formatting.
2. Add unit tests for the Na:K default, the approved Na → Cl → Mg cycle, wraparound, distinct-pair behavior, orientation, zero numerator, and zero denominator.
3. Add a standalone custom-ratio display with two independently actionable, ion-colored controls and accessible names; keep it separate from `WatermancerIonRelationshipDisplay`.
4. Hold the pair selection in the Watermancer readings owner, initialize it from the last valid browser-stored pair, and save changes locally. Pass the same values to compact and classic displays so both remain synchronized; default to Na:K when no valid pair is stored.
5. Use the existing live ratio-ion source: final-mixture values when modeled, otherwise the target preview. Render the new item independently of the combined/pairwise toggle and preserve all current ratios and toggle behavior.
6. Verify stored-pair restoration and invalid-value fallback, compact and classic layouts, keyboard interaction, zero denominator handling, and that cycling never changes targets, saved profiles, recipe ratios, or solver inputs.
7. Run focused tests, the calculator test suite, type checking, production build, and inspect the running preview.

## Boundaries

- Do not change GH:KH, Mg:Ca, Cl:SO₄, K:Mg, Na:Ca, the combined relationship, or their existing view switch.
- Persist only the selected ion pair in this browser; do not sync it with account data or send it into recipe editing, Watermancer solving, saved profiles, or charge-balance checking.