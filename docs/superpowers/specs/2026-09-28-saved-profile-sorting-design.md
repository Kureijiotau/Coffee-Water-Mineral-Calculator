# Saved profile sorting design

## Goal

Let users sort their saved Watermancer profiles and recipes by name or date added in the pickers that show their personal entries.

## Recommended approach

Replace the manual “Change order” controls with a “Sort saved” control in the open picker. Provide:

- Name, A–Z
- Date added, newest first
- Date added, oldest first

Use one sort preference shared across the pickers and persist it in local storage. Default to Name, A–Z. Apply sorting only to user-owned saved profiles and recipes; built-in and published catalog groups keep their current order.

The sort control opens an accessible dialog within the picker. The picker stays visually unchanged while closed. The selected mode is indicated in the dialog and can be changed without selecting a profile or recipe.

## Date handling

Newly created Watermancer profile and saved-recipe IDs already contain their creation timestamp. Decode those timestamps for date sorting; do not add fields to the saved record formats or migrate local data. For legacy IDs without a valid timestamp, retain their input order after timestamped items in date-sorted modes.

## Manual order transition

Remove the manual up/down and reset controls. The old persisted manual-order value is no longer consulted. Saved profile and recipe data remain intact.

## Scope and behavior

- Apply the same sort mode wherever user-owned profiles or recipes are shown in pickers, including the mineral recipe, target-source, and profile-comparison pickers.
- Sort mixed profile and recipe names by the underlying saved name, ignoring the “Profile ·” / “Recipe ·” display prefix.
- Do not reorder built-in or published options.
- Keep profile selection, editing, deletion, and current target behavior unchanged.

## Testing

- Verify name sorting is case-insensitive and stable for equal names.
- Verify both generated ID timestamp formats sort newest-first and oldest-first.
- Verify IDs without timestamps remain stable and follow timestamped entries in date modes.
- Verify the selected sort mode persists after reload and is shared across picker instances.
- Verify built-in/catalog options remain in their existing order and that selecting a saved item still selects the same source.
- Run the calculator typecheck and full test suite; smoke-test the picker in the browser.