# Watermancer Charge-Balanced Ion Crafting

## Goal

Let users shape unusual Watermancer ion targets in deliberate increments without ever applying a charge-unbalanced target set. For example, a user can raise magnesium while choosing sulfate as its balancing ion, keeping chloride low.

This feature adjusts ion targets; it does not promise a particular taste, salt recipe, solubility, or sensory result.

## User experience

- Add a compact, labeled **Craft ions** button inside the existing Watermancer target-editing experience.
- Clicking the button opens an accessible modal containing the existing crafting controls. Keep the ion colors and formula cues visible in the trigger and dialog.
- In the modal, the user selects a primary ion, an opposite-charge balancing ion, and a target value. Provide small decrement/increment buttons and selectable ppm step sizes for precise changes.
- Show the calculated balancing-ion target and a preview of both affected values before applying the adjustment.
- Apply the primary and balancing-ion values atomically to the existing target draft. Do not expose an intermediate, unbalanced target set to the Watermancer matcher.
- Keep the modal open after Apply and show the existing confirmation. Allow dismissal through the dialog close button, Escape, or the backdrop; close it when the existing edit session ends.
- Keep every other ion target unchanged. Repeating the operation with another primary/counter-ion pair allows users to shape multiple parts of the profile.
- Example: increasing Mg²⁺ while balancing with SO₄²⁻ recalculates sulfate from the other current targets, so chloride remains unchanged. The user can then adjust chloride using a suitable cation as its balancing ion.

## Charge calculation and constraints

- Use the existing ion charge and molar-mass definitions to calculate charge in milliequivalents per liter (meq/L), not a fixed ppm-to-ppm ratio.
- For a proposed primary-ion target, solve the selected opposite-charge ion's ppm target so total positive and negative charge across the active target set are equal.
- The calculation must account for all current active-ion targets, including any existing charge gap. A successful apply therefore leaves the complete target set charge-balanced, rather than merely preserving an earlier imbalance.
- Filter balancing-ion choices to ions with the opposite charge.
- If the required balancing target is negative, invalid, or non-finite, do not allow the change. Explain that the chosen partner cannot balance the current set and let the user choose another partner or adjust a different ion.
- Round displayed and applied target values consistently with the existing target precision, and verify the resulting charge difference against the existing balance tolerance. If rounding cannot meet that tolerance, reject the apply rather than saving an unbalanced result.

## Integration boundaries

- Reuse the existing Watermancer target draft and save/cancel behavior; do not add a separate profile store or change target-source persistence.
- Continue sending the resulting target set through the existing Watermancer plan and solver. Do not change salt selection, water selection, matching strategy, or chemistry rules.
- Do not add a separate full-profile checker or correction-suggestion surface. Craft ions itself calculates a balanced pair against all active target values.
- The solver may still report that selected salts or waters cannot realize a balanced target. Charge neutrality is necessary for ionic plausibility, not a guarantee of recipe feasibility.

## Testing

- Unit-test charge-equivalent partner calculations across monovalent and multivalent ion pairs, including Mg²⁺/SO₄²⁻ and Mg²⁺/Cl⁻.
- Verify a successful calculation balances the entire target set, accounts for a pre-existing charge gap, and leaves all non-pair targets unchanged.
- Verify impossible negative partner values, invalid inputs, and rounding outside the existing balance tolerance are rejected without modifying the draft.
- Add UI tests for the compact trigger, modal open/close behavior, opposite-charge partner options, preview values, atomic apply, and use within existing save/cancel behavior.
- Confirm Apply keeps the modal open and shows its confirmation, and verify the removed full-profile checker does not reappear.
