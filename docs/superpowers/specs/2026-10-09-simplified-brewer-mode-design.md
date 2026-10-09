# Simplified Brewer Mode

## Status

Design approved section by section; written spec is pending user review.

## Summary

Add a new **Brewer** calculator tab to the left of **Alchemist**. Brewer is a simpler salt-recipe workspace that shares the active recipe state and chemistry with Alchemist. Watermancer remains a separate ion-target/source-water workspace.

Brewer keeps the recipe, batch, and concentrate workflow but omits mineral-water crafting and the profile-based ion-watch disclosure. Its salt table is grouped and colored by GH and KH contribution, with a separate neutral section for salts that contribute to neither.

## Goals

- Add a clearly selectable Brewer mode without changing Alchemist or Watermancer behavior.
- Make Brewer's mineral recipe table easier to scan by separating GH and KH contributors.
- Ensure Brewer readings and recipe outputs represent a salt-only recipe in RO/distilled water.
- Preserve the user's shared recipe state and any Alchemist mineral-water inputs when switching modes.

## Non-goals

- Do not restore the retired flavor-slider/pyramid Brewer experience.
- Do not create a second chemistry engine or duplicate salt-recipe state.
- Do not remove, reorder, or change Watermancer controls.
- Do not delete Alchemist mineral-water entries when entering Brewer.

## Mode and state behavior

- Show calculator modes in this order: **Brewer**, **Alchemist**, **Watermancer**.
- Keep Alchemist as the existing default for users who have not explicitly selected a mode. Brewer becomes active only after the user selects it.
- Brewer and Alchemist share the active saved/custom recipe, salt targets, hydration forms, batch volume, recipe catalog, and concentrate recipe state. Switching between them must not discard or duplicate recipe edits.
- Brewer retains the current Alchemist recipe controls: recipe selection, save, import, share/export, hydration forms, direct-dose editing, batch volume, concentrate preparation, recipe steps, and the GH/KH/TDS summary.
- Alchemist remains behaviorally and visually unchanged except for its tab position.
- Watermancer remains independent and keeps its current target, water, salt-matching, and ion-watch behavior.
- The old flavor-derived Brewer calculations and interface remain inactive. The new Brewer mode must use the shared salt recipe and the same chemistry calculations as Alchemist.

## Brewer-only presentation and calculation rules

- Hide the entire **Craft with mineral water as a base** panel in Brewer. Keep batch-volume and concentrate controls available.
- Do not clear or edit `mineralWaters` or `additionWaters` when switching to Brewer. While Brewer is active, exclude those entries from all displayed ion totals, GH/KH/TDS summaries, concentrate guidance, recipe steps, and recipe exports. When the user returns to Alchemist, restore and use the retained water entries as before.
- Omit the Aiki/profile-based `IonWatchDisclosure` at the bottom of Brewer's salt table. Keep it in Alchemist.
- Brewer recipe exports must reflect the salt-only finished-water ion totals and must not include the hidden Alchemist source-water entries as Brewer's base.

## Brewer salt-table grouping

Use the salt's modeled ion contributions as the source of truth for its category:

1. **GH contributors** — salts that contribute calcium or magnesium.
2. **KH contributors** — salts that contribute bicarbonate or carbonate and do not contribute calcium or magnesium.
3. **Additional ions** — salts that contribute to neither GH nor KH.

Each salt appears once. Preserve the current `WATERMANCER_SALT_ORDER` relative order within each category. Keep existing hydration-form controls, direct-dose controls, and the meme-salt visibility toggle.

Use visible section headings for **GH contributors**, **KH contributors**, and **Additional ions**. Apply the existing hardness color family as a subtle row background for GH salts (indigo) and the existing buffer color family for KH salts (amber). Keep Additional ions neutral. Do not label the final section “Other salts.”

The current catalog has no salt that contributes to both GH and KH. If one is added later, keep the row unique, place it in the GH section because GH has priority, and mark both contributions rather than duplicating the editable row.

## Persistence and legacy compatibility

- Persist the newly selected calculator tab as an explicit mode choice; do not infer the new Brewer tab from legacy `NerdLevel: 'brewer'` data.
- Preserve the current initial-mode behavior for users without the new mode preference: Alchemist remains the default unless Watermancer is already selected.
- New saved-plan snapshots created in Brewer must carry an explicit modern calculator-mode value so they can reopen in Brewer.
- Legacy saved plans that have no modern mode value and contain the old `NerdLevel: 'brewer'` marker must keep their existing restore behavior; they must not silently activate the new Brewer view.
- Shared saved recipes remain usable in both recipe tabs and retain their existing IDs and salt data.

## Design and interaction details

- Keep the existing mode-switcher visual treatment, adapted to three tabs and responsive on narrow screens.
- Group headings and row tints supplement one another: users must be able to identify GH and KH groups without relying on color alone.
- Brewer's salt-only result should be apparent from its visible salt totals and lack of a mineral-water panel; no hidden source-water amount may affect its displayed chemistry.

## Verification

- Unit-test the salt grouping helper: all catalog salts appear exactly once, in GH/KH/Additional ions order, with stable order inside each group.
- Verify the three-tab order, selected state, and responsive layout.
- Verify that edits to salt targets, hydration forms, and batch volume remain visible when switching Brewer ↔ Alchemist.
- Verify that Brewer hides the mineral-water panel and ion-watch disclosure, ignores retained source-water data in all Brewer calculations/exports, and that Alchemist restores and uses those entries after switching back.
- Verify that Alchemist's mineral-water panel and ion-watch disclosure remain unchanged and that Watermancer behavior is unaffected.
- Verify old saved-plan compatibility and that only explicitly selected new Brewer plans reopen in Brewer.
- Run the existing unit/type/build checks and targeted browser tests for the complete interaction path.
