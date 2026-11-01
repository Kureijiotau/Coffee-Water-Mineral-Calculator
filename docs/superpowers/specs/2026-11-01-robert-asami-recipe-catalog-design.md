# Robert Asami Recipe Catalog Design

## Goal

Make all seven default recipes from Robert Asami’s Week 1 guide selectable from the built-in recipe catalogs in Brewer, Alchemist, and Watermancer, and make “Use this recipe” open Brewer with the selected guide recipe applied.

## Current behavior

The Week 1 guide owns its seven recipe records and displays one at a time. “Use this recipe” applies the selected salt targets to Brewer state but leaves the user on the Guide page. Brewer and Alchemist share built-in salt-recipe data, while Watermancer has a separate built-in target-source picker.

## Design

Keep one canonical data set for the seven published/default daily recipes. The Guide, Brewer/Alchemist recipe catalogs, and Watermancer target catalog must derive from that data rather than maintaining separate copies.

Add one built-in group labeled **Robert Asami · Week 1** to each relevant picker. It contains seven selectable entries, Day 1 through Day 7. Brewer and Alchemist entries preserve the source salt recipe and hydration forms. The Watermancer entry for each day is derived by running the same salt recipe through the existing ion chemistry engine on the guide’s distilled/RO, zero-TDS water basis. Do not manually estimate or round the ion targets beyond existing engine behavior.

Only the default/published recipe for each day appears in the built-in catalogs. Day 5’s optional magnesium and buffer swaps remain available in the interactive guide and are not added as extra catalog entries.

When a user selects **Use this recipe** in the guide, switch to the Calculator workspace in Brewer mode, then apply the currently selected day’s active salt targets and hydration forms. Applying after the mode switch is required so Brewer’s normal mode-entry reset cannot overwrite the selected guide recipe. The action should keep the current Day 5 swap choices if the user selected them in the guide.

## User experience and boundaries

- Existing built-in recipes and personal saved recipes remain unchanged.
- Catalog entries are read-only built-ins and must not be duplicated into the user’s saved recipes.
- Selecting a Week 1 recipe in Brewer or Alchemist loads the source salt recipe into that mode’s existing recipe workflow.
- Selecting a Week 1 recipe in Watermancer sets the corresponding derived ion targets through the existing target-source behavior.
- The Guide remains available as its own workspace; only the **Use this recipe** action hands off to Brewer.
- The recipe chemistry remains anchored to the guide’s zero-TDS starting water. Source-water matching and blend choices remain Watermancer behavior.

## Acceptance criteria

1. Brewer and Alchemist each show one **Robert Asami · Week 1** built-in group with Day 1–Day 7.
2. Watermancer shows the same group and days as selectable ion-target sources.
3. Brewer/Alchemist salt amounts and hydration forms match the guide’s default daily recipes.
4. Watermancer ion targets match the chemistry engine’s computed ion totals for those same recipes on zero-TDS water.
5. Day 5’s two optional guide swaps do not appear as separate built-in catalog entries.
6. **Use this recipe** leaves the Guide, opens the Calculator in Brewer mode, and retains the selected day’s active recipe targets and forms.
7. Existing catalog entries, saved recipes, and normal mode-switch behavior continue to work.

## Verification focus

- Check all seven generated entries, including empty/non-used salts and hydration-form indices.
- Assert calculated Watermancer targets for representative recipes with distinct counterions, including Day 1 and Day 6.
- Verify the default-only Day 5 catalog entry while confirming the interactive guide can still apply either swap.
- Verify the Brewer handoff applies after the mode switch and does not get cleared by Brewer initialization.
- Verify recipe selection in both the Alchemist and Watermancer pickers preserves their current mode-specific behavior.
