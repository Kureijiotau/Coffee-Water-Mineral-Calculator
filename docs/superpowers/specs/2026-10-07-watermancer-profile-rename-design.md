# Watermancer Profile Rename in Edit

## Goal

Allow users to rename a saved Watermancer profile from the existing Edit flow, without creating a duplicate profile.

## Interaction

- When Edit is active for a selected saved Watermancer profile, show a compact name field prefilled with the profile’s current name, directly below the profile picker.
- Do not show the rename field for built-in targets or saved recipes.
- Save the trimmed, non-empty name together with the edited ion targets when the user selects **Overwrite selected**. Update the existing profile, preserve its ID and other metadata, keep it selected, and refresh its picker label.
- A blank or whitespace-only name prevents the overwrite and shows inline validation.
- **Cancel** discards both the name draft and target edits. Switching target sources also cancels the draft.
- Keep **Save as new** as a separate flow; saving a new profile must not rename the selected profile.
- Keep the existing single-row toolbar layout unchanged; the name field appears outside the toolbar.
- The final-readings overwrite flow remains separate. If it is used while target/name edits are pending, retain its existing confirmation that those edits will be discarded.

## Acceptance Criteria

1. Editing a saved profile shows its current name in an editable field.
2. Overwriting a saved profile commits its renamed value and edited targets together while preserving the profile ID and selection.
3. An empty name cannot be committed; canceling discards the draft name and target edits.
4. Built-in targets and saved recipes do not show the rename field.
5. Saving as new continues to create a separate profile with its own entered name.

## Verification

- Add unit or component coverage for name normalization and updating the existing profile record.
- Add browser coverage for the Edit, overwrite, cancel, and Save as new paths.
