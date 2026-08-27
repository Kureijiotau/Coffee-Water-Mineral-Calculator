# Recipe-step salt ppm contribution

## Goal

Show the total modeled mineral ppm contribution for each salt in the existing
recipe-steps card, beside the physical mass or drop amount.

## Behavior

- Keep the current amount label and dosing behavior unchanged.
- For each displayed salt, calculate its contribution using the same
  `stepSaltTargets` already used to build the final recipe.
- Sum the salt's modeled ion contributions across all ions.
- Display one compact line such as `Adds 8.2 ppm total minerals`.
- Use the final-water target basis, so concentrate strength changes the stock
  mass but does not multiply the displayed finished-water ppm.
- If a salt has no positive modeled contribution, omit the contribution line.

## Implementation

Add a pure helper in the shared chemistry module that accepts a salt target and
returns the sum of that salt's modeled ion totals. The recipe-step modal will
call the helper for each ordered salt and render the result beneath the salt
name while leaving `amountLabel` as the source of truth for mg/g/drops.

## Testing

- Verify the aggregate for a multi-ion salt equals the sum of its individual
  modeled ion fractions.
- Verify zero and missing targets produce zero.
- Verify the recipe-steps UI uses the active step target, including suggested
  fallback targets.