# Water Tasting Profile Picker Design

## Goal

Make every profile available in the Alchemist profile collection and every saved Watermancer target profile selectable as context for a Water Tasting record.

## Current profile sources

- Alchemist uses `WaterProfile` entries from `loadProfiles()`. The collection includes built-in Aiki, Watermancer Sensory, and Empirical profiles, plus user-saved ion-range profiles.
- Watermancer uses saved `WatermancerProfile` target profiles from `loadWatermancerProfiles()`.
- Watermancer also exposes the Empirical subset of the shared `WaterProfile` collection as target sources; those entries will appear once in the Alchemist group because they are the same profile records.
- The tasting picker currently exposes the Aiki safe profile, current salt table, and Watermancer saved targets.

These collections describe different things: Alchemist profiles define ion ranges for guidance, while Watermancer profiles define ion targets. The tasting picker records only the selected profile's identity and name; selection does not affect chemistry or scoring.

## Approaches

1. **Separate groups by source (selected).** Keep Built-in options, add all Alchemist profiles under an Alchemist group, and show saved Watermancer targets under a Watermancer group. This makes profile meaning clear and retains all source entries.
2. **One combined saved group.** Include both profile collections in one group and prefix labels with their source. This changes the picker less, but makes a longer list harder to scan.

## Option identity and compatibility

- Keep the existing `safe-profile` and `salt-table` option IDs and labels.
- Give each Alchemist profile a namespaced `alchemist:<profile-id>` source ID, including the Aiki profile entry. Keep the existing Aiki safe option as a distinct built-in context.
- Keep Watermancer saved profile IDs in the existing `saved:<profile-id>` format.
- Store the chosen profile ID and its name snapshot in the tasting record. Existing tasting records need no migration.
- If a profile is renamed, editing an existing tasting preserves its saved name snapshot; a new tasting uses the current name. If a profile is deleted, its record remains editable with an unavailable-profile option based on the stored snapshot.

## UI behavior

The picker displays Built-in, Alchemist, and Watermancer optgroups. The Saved/unavailable group is shown only when editing a record whose original profile no longer exists. The Watermancer link remains visible when there are no saved Watermancer targets, even if Alchemist profiles are available.

Options are derived from the current Alchemist and Watermancer profile state, not a separate registry or one-time list. When a profile is added to either collection, the picker receives the updated options through normal application state updates without requiring a second manual entry.

## Non-goals

- Do not change the scorecard, ratings, descriptors, or tasting-history behavior.
- Do not use profile selection to change water targets, salt calculations, or other chemistry.
- Do not add saved recipes, non-profile imported waters, or Brewer taste preferences as profile choices.

## Verification

- Unit-test that every Alchemist profile and every saved Watermancer profile appears with the correct group and distinct source ID, while existing built-in options remain.
- Verify that adding a profile to either source collection produces a picker option from the updated collection.
- Verify the no-saved-Watermancer path still links to Watermancer.
- Verify saved selections retain their ID/name snapshots across rename and deletion, and existing tasting records remain readable.
- Run the calculator typecheck, unit suite, production build, and relevant browser coverage.