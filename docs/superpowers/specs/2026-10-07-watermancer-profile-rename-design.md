# Rename Saved Watermancer Profiles and Recipes in Edit

## Goal

Allow users to rename either a saved Watermancer profile or a saved recipe from the existing Edit flow.

## Interaction

- When Edit is active for a selected user-saved Watermancer profile or saved recipe, show a compact name field prefilled with the selected item’s current name, directly below the profile picker.
- Label the field according to the selected item: **Profile name** or **Recipe name**.
- Do not show a rename field for built-in, external, or other catalog targets.
- Save the trimmed, non-empty name together with the edited ion targets when the user selects **Overwrite selected**. Update the existing profile, preserve its ID and other metadata, keep it selected, and refresh its picker label.
- For a saved recipe, show a separate **Rename recipe** action beside the name field. It saves only the trimmed recipe name, preserving the recipe ID, salt data, and other metadata; keep the recipe selected, refresh its picker label, and show a brief save confirmation. Do not change or commit Watermancer ion-target edits as part of renaming a recipe.
- After renaming a recipe, keep Edit active and leave any ion-target draft intact so the user can separately save it as a Watermancer profile or cancel it.
- A blank or whitespace-only name disables the applicable save action and shows inline validation.
- **Cancel** and switching target sources discard uncommitted name and target drafts. A recipe rename already committed with **Rename recipe** is not undone by a later Cancel.
- Keep **Save as new** as a separate flow; saving a new profile must not rename the selected saved item.
- Keep the existing single-row toolbar layout unchanged; the name field appears outside the toolbar.
- The final-readings overwrite flow remains separate. If it is used while target/name edits are pending, retain its existing confirmation that those edits will be discarded.

## Acceptance Criteria

1. Editing a saved profile or saved recipe shows its current name in an editable field.
2. Overwriting a saved profile commits its renamed value and edited targets together while preserving the profile ID and selection.
3. Renaming a saved recipe changes only its name, preserves its salt data and ID, and leaves ion-target edits untouched.
4. An empty name cannot be committed; canceling discards uncommitted name and target drafts.
5. Built-in, external, and other catalog targets do not show a rename field.
6. Saving as new continues to create a separate profile without renaming the selected saved item.

## Verification

- Add coverage for trimming names and preserving saved profile/recipe identity and data.
- Add browser coverage for profile overwrite, recipe rename, cancel, and Save as new paths.
