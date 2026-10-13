# Watermancer Dropper Guide

## Status

Design approved section by section; written spec is pending user review.

## Summary

Add a new top-level **Watermancer Guide** tab, separate from the existing Guide tab and its Brewer Week 1 course. The new tab teaches the user's calibrated, one-salt-per-dropper method and how to apply it while building target-first recipes in Watermancer.

The guide has a step-by-step path plus quick-reference sections. It reuses the existing DIY Concentrate and Watermancer workspaces as the source of truth for calculations. It does not save a multi-salt pantry, change recipe inputs, or add chemistry calculations.

## Goals

- Teach users to calibrate each dropper and prepare a separate stock for each salt.
- Use **1 mg of the selected physical salt per drop** as the standard pantry target.
- Explain how balanced final-ion targets and a chosen mineral-water base lead to Watermancer's recommended salt doses.
- Make the dose conversion straightforward: when the stock delivers 1 mg of that salt per drop, the displayed salt dose in mg is the same number of drops.
- Explain how to make a 1 L final batch by topping the mineral-water base and salt drops up with 0-TDS water.
- Keep the guide easy to find without expanding the Calculator workspace.

## Non-goals

- Do not create, persist, or sync a multi-salt dropper pantry or calibration inventory.
- Do not store guide completion or progress.
- Do not duplicate or change Watermancer's ion solver, charge balancing, salt-dose calculations, or the existing DIY Concentrate calculator.
- Do not alter existing concentrate strength defaults, recipes, Watermancer targets, or selected salt forms from the guide.
- Do not replace or modify the existing Brewer Week 1 Guide.

## Confirmed product decisions

- **Placement:** Add a separate top-level app tab named **Watermancer Guide**.
- **Organization:** Include both a guided sequence and independently accessible reference topics.
- **Scope:** Instruction only; no saved pantry.
- **Recipe path:** Lead with balanced final-ion targets, then use Watermancer's calculated salt doses. Explain manual dose changes as a reference technique for taste iteration, not as the main path.
- **Stock target:** Teach one salt per dropper at 1 mg of that salt per drop. The user states every salt in the current app catalog dissolves at this weak concentration. Do not present 1 mg/drop itself as inherently risky; continue to respect any specific warnings produced by the existing concentrate tool.
- **Batch method:** Use a 1 L final recipe and top up the measured ingredients with 0-TDS water to the bottle's verified 1 L brim or fill line.

## Navigation and page structure

- Add **Watermancer Guide** as its own selectable entry in the app-level workspace tab list. It is not a Calculator mode and must not be confused with the current **Guide** tab.
- Render the new page with the shared app header and a dedicated, responsive guide layout.
- Split the page into:
  1. A guided path with clearly ordered steps and navigation between them.
  2. Quick-reference sections that can be opened independently, such as accordions or anchored sections.
- Provide contextual actions to open **Concentrates → DIY Concentrate** and **Calculator → Watermancer**. These actions only navigate to the existing workspaces; they do not write, reset, or otherwise modify recipe inputs.
- Keep guide navigation state in memory only. Leaving and returning to the tab does not create persisted guide progress.

## Guided path

1. **Set up the supplies.** Gather the salts, separate droppers, a suitable scale, and one bottle for each stock. Keep each salt in its own bottle and label it with the salt and physical hydration form.
2. **Calibrate each dropper.** Count and weigh a known number of drops for each dropper. Enter the measured drop count and liquid mass in the existing DIY Concentrate workflow; verify the measured output using the prepared stock when practical.
3. **Prepare 1 mg/drop stocks.** In **Concentrates → DIY Concentrate**, select one salt and its hydration form, enter the dropper calibration, and adjust stock strength until the existing tool reports 1.00 mg of that salt per drop. Follow the tool's preparation values. Repeat separately for every salt; the guide itself does not save the pantry.
4. **Set up the Watermancer recipe.** Open Watermancer, set the final batch volume to 1 L, and add the actual mineral-water source and volume that will be used. Choose or create the desired final-ion profile. Use **Craft ions** when adjusting a pair of ion targets so the complete target set stays charge balanced.
5. **Read the salt plan.** Select the salts and hydration forms that match the prepared bottles. Watermancer calculates the salt amounts for the final target while accounting for the selected source water. For a stock that actually delivers 1.00 mg of the selected salt per drop, a 7 mg dose means 7 drops. If the measured stock output differs, use `required salt mg ÷ actual salt mg per drop` rather than assuming a one-to-one count.
6. **Make and taste the 1 L batch.** Add the measured mineral-water base and calculated salt drops to a verified 1 L bottle, then top up with 0-TDS water to its final 1 L brim or fill line. Mix, review the final ion readings, and change one target or dose at a time when testing a new taste.

## Quick-reference topics

- **Drop calibration:** What to count and weigh, how the measured drop mass is used, and why each physical dropper should be checked separately.
- **1 mg per drop:** The difference between mg of salt per drop and ion ppm in the finished water; the displayed mg/drop from the existing DIY Concentrate tool is authoritative.
- **Salt form:** The hydration form used to prepare the physical stock must match the form selected for Watermancer's salt-dose calculation.
- **Target ions and charge:** Watermancer targets are final-water ion concentrations. Charge balance depends on molar mass and ionic charge, not equal ppm values.
- **Mineral-water base:** Source-water ions contribute to the final mixture; the target describes the completed water, not just the added salts.
- **Final volume:** Set Watermancer's batch volume to 1 L and top up after adding the base and salts. The remaining 0-TDS water is the difference to final volume, so users do not need to weigh that remainder.
- **Dose-to-drop conversion:** `drops = required salt mass in mg ÷ actual salt mg per drop`; the values match when the stock is verified at 1.00 mg/drop.
- **Taste iteration:** Treat the calculated plan as a starting point, make one controlled change at a time, and compare final readings and taste.

## Chemistry and copy boundaries

- Keep ion-target ppm, salt-target ppm, physical salt mg, and mg/drop distinct. A 1 mg/drop stock maps a physical salt dose in mg to a drop count; it does not mean one drop adds 1 mg of every ion in that salt.
- Use existing app calculations and labels rather than recalculate targets, mineral-water contributions, or salt masses inside the guide.
- Explain that a stock's hydration form matters both when weighing the bottle and when selecting the salt in Watermancer.
- Do not imply that all water has exactly the same density or that conductivity-meter TDS ppm must match the sum of modeled ion mg/L.
- Do not make taste guarantees or prescribe universal target values. The guide teaches users how to create and test their own target profiles.
- Do not suppress specific concentrate warnings shown by the existing tool. The guide should not introduce a blanket warning that 1 mg/drop is unsafe.

## Implementation boundaries

- Add a dedicated `watermancer-guide` app-tab value and an accessible top-level tab entry.
- Implement the guide in a separate component and load it lazily, following the existing lazy Guide pattern.
- Pass explicit navigation callbacks for opening the DIY Concentrate subtab and Watermancer Calculator mode.
- Do not add storage fields, server routes, database tables, new solver code, or package dependencies.
- Keep the new tab responsive and keyboard accessible. The current Brewer Week 1 Guide and existing calculator routes must continue to behave as before.

## Verification

- Verify the app-level tab list exposes **Watermancer Guide** as distinct from **Guide**, with correct selected state and keyboard-accessible navigation.
- Verify the guide renders the ordered setup path and the quick-reference topics, including 1 mg/drop, hydration-form matching, balanced targets, source-water contribution, 1 L final volume, and dose-to-drop conversion.
- Verify the two guide actions open the existing DIY Concentrate and Watermancer workspaces without changing recipe inputs or target values.
- Verify the existing Guide, Concentrates, and Watermancer workflows remain unchanged when the new tab is not selected.
- Verify responsive layout and run the package's existing test, type, and build checks.
