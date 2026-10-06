# Watermancer Target Card and Profile Actions

## Context

The Watermancer target card places its title, target-source picker, profile actions, sharing/import controls, reset, strength, and comparison controls in one wrapping header. This makes the controls difficult to scan and align across screen sizes.

The card already supports editing a draft, saving it as a new named profile, and overwriting the selected saved profile. A separate “Add new” workflow seeds a profile from live final-mixture readings. That existing behavior must remain unchanged.

## Goals

- Align the target card’s controls into responsive, easy-to-scan groups.
- Add a separate “New” action for creating a zero-target profile.
- Ask for the new profile’s name immediately and save/select it when a non-empty name is submitted.
- Keep “Save as new” and “Overwrite selected” reliable and verify their persistence behavior.

## Non-goals

- Do not change the chemistry model or profile schema.
- Do not change the existing “Add new” final-mixture seeding behavior.
- Do not change unrelated Watermancer, Alchemist, or Mixer workflows.

## Layout

Replace the single crowded header arrangement with two responsive groups:

1. Keep the “Set your target water” title, source link, and target-source picker together.
2. Align profile actions together, with utility actions grouped separately.

Keep actions visible rather than moving them into an overflow menu. Use consistent control sizing and spacing. At narrow widths, the groups wrap into clear rows without overlapping or squeezing the target-source picker.

## New zero-target profile

- Show “New” when the card is not already editing a profile.
- Clicking “New” opens the existing inline name-entry treatment immediately and focuses the name field.
- A blank or whitespace-only name cannot be submitted. Cancel or Escape closes the prompt without changing the current selected profile or its targets.
- On name submission, trim the name, create a Watermancer profile with every `ACTIVE_ION_IDS` target set to exactly `0`, persist it through the existing profile-save path, and select the new profile.
- Clear any temporary target override after creation so the selected saved profile is the visible source of truth.
- Do not offer “Overwrite selected” while the new-profile prompt is active; starting a new profile must not make it possible to overwrite the previously selected profile with zeros.

The existing “Add new” action remains a distinct flow seeded from live final-mixture ion readings.

## Save and overwrite

- Preserve “Save as new” for saving the complete current draft under a new name. After a successful save, select the newly created profile and clear the edit session.
- “Overwrite selected” is available only when editing a saved Watermancer profile. It updates the selected profile’s complete target set while preserving its ID, name, and metadata, leaves that profile selected, and clears the temporary override/edit session.
- Both actions use the existing account-aware profile persistence path.

## Accessibility and interaction

- Keep the name field labeled and focused when the prompt opens.
- Enter submits a valid name; Escape and the cancel control dismiss the prompt without changing saved data.
- All visible action buttons retain accessible names at narrow widths, including when their text labels are visually condensed.
- New, Save as new, and Overwrite selected must not trigger more than one save for a single submission.

## Verification

- At desktop and narrow mobile widths, confirm that the title/source picker and action groups remain aligned and usable.
- Confirm New opens the name prompt immediately, saves a zero-target profile after a valid name, selects it, and persists it.
- Confirm canceling New or submitting a blank name does not change the selected profile or saved profile list.
- Confirm the existing “Add new” flow still seeds from live final-mixture readings.
- Confirm Save as new persists and selects the entire edited draft.
- Confirm Overwrite selected updates the selected profile’s targets, preserves its identity and metadata, and persists the updated profile.
- Keep and extend the existing Watermancer profile-save browser test where appropriate; run typecheck and unit tests as well.

## Self-review

- No placeholder requirements remain.
- The new zeroed profile flow is explicitly separate from the existing final-mixture-seeded “Add new” flow.
- The save paths define which profile is selected after success and what cancel does.
- Scope is limited to the Watermancer target card and its saved-profile actions.
