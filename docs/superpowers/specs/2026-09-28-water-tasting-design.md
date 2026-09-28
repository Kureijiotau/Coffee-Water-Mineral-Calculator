# Water Tasting design

## Goal

Add a Water Tasting tab where users can describe and score how a selected Watermancer water target performs in one brewed cup. The scorecard takes loose inspiration from coffee sensory evaluation, but it is an informal water-contribution assessment, not an official Q scorecard or a coffee-quality score.

## User-approved direction

- Add a separate Water Tasting tab to the existing calculator.
- Score one coffee cup at a time, brewed with the selected water.
- Use a one-page scorecard with expandable descriptor choices.
- Keep prompts neutral: selecting a profile records context and does not alter prompts, calculate sensory predictions, or change ratings.
- Save tasting records locally, with editing and deletion.
- Coffee name, roast, origin, and brew method are optional.
- Rate water contribution, not personal liking or coffee quality.
- Use Watermancer target profiles only; do not include Brewer taste-preference profiles or ion-guidance range profiles.
- Include built-in Watermancer target choices as well as saved Watermancer target profiles.

## Profile selection

The profile selector includes:

- The built-in Aiki safe profile target.
- The current salt-table target.
- User-saved Watermancer target profiles.

Do not include the separate Aiki, Watermancer Sensory, or empirical ion-guidance profile records, published water recipes, or Brewer flavor preferences in this selector. The built-in Aiki safe-profile target above remains included. The chosen source is saved as note context only.

When no saved target profiles exist, show the built-in targets and a clear path to Watermancer for creating a saved target profile. If the profile is renamed or removed later, the tasting history retains its original profile ID and display-name snapshot.

## One-page tasting flow

Present the controls in this order:

1. Select a built-in or saved Watermancer target.
2. Optionally enter coffee name, roast, origin, and brew method.
3. Complete the five water-contribution ratings.
4. Optionally expand the descriptor area and select any number of water-character and cup-effect tags.
5. Save the tasting.

The scorecard uses these equally weighted 0–10 integer ratings:

- **Clarity:** how clearly the cup’s qualities come through with this water.
- **Flavor expression:** how well the water supports the coffee’s flavor expression.
- **Balance:** how well the cup’s qualities fit together with this water.
- **Mouthfeel:** how well the water supports the cup’s texture.
- **Finish:** how cleanly and favorably the cup ends with this water.

Each prompt asks how well the water supported that quality in this cup. A total out of 50 appears only when all five ratings are present. Partial scorecards can still be saved and edited. The sum is a user-entered sensory impression; it must not be presented as an objective measurement or official Q score.

Descriptor tags do not contribute to the score. Organize them into expandable water-character and cup-effect groups. Starter vocabulary may include clean/neutral, mineral, chalky, metallic, crisp, round, thin, heavy/coating, drying, flat/muted, and lingering finish. Keep tags selectable in any combination and do not infer them from profile ions.

## Saved tasting history

- Show saved tastings beneath the scorecard, newest first.
- Each history card shows the profile snapshot, date, any available total, selected descriptors, and coffee name when supplied.
- Reopening a card loads it for editing; deleting a card requires confirmation.
- Saving a new tasting creates a record. Saving an edited tasting updates that record rather than adding a duplicate.
- Optional coffee fields may remain blank.

## Data and persistence

Use browser local storage, consistent with the existing locally saved Watermancer profiles. Add a dedicated versioned tasting-record key; do not alter existing profile or recipe storage.

Each record contains:

- Stable tasting ID, creation time, and last-updated time.
- Watermancer target source ID and display-name snapshot.
- Optional coffee name, roast, origin, and brew method.
- Zero or more ratings keyed by the five score dimensions.
- Selected descriptor IDs.

Compute the total from the ratings at display time; do not persist a duplicate total. No server, account sync, sharing, import/export, or cup-to-cup comparison is included.

## UI and accessibility

- Match the existing dark instrument-console styling.
- Keep profile selection, optional coffee details, ratings, descriptors, and save action visibly separated.
- Use touch-friendly 0–10 controls with the current value clearly shown, keyboard operation, and explicit labels.
- Stack sections on narrow screens without hiding ratings or the save action.
- Keep error and success feedback visible to assistive technology.

## Errors and data safety

- Validate parsed tasting records before rendering.
- If local storage is unavailable or saving fails, keep the current form state and show a clear error; do not claim that a tasting was saved.
- Do not overwrite malformed stored tasting data silently. Show an error state and preserve the user's current in-memory work.
- Confirm deletion before removing a saved record.

## Implementation boundaries

- Add a focused WaterTasting tab component and a small data/persistence module for tasting records and score calculation.
- Pass the approved built-in and saved Watermancer target choices into the tab from the existing app state.
- Do not change Watermancer chemistry calculations, profile targets, Brewer taste state, recipe persistence, or the existing profile catalogs.

## Acceptance checks

- The Water Tasting tab appears in the existing app navigation.
- The selector offers the built-in Aiki safe target, current salt-table target, and saved Watermancer target profiles.
- Choosing a profile does not change prompts or scores.
- The five ratings accept 0–10 integer values; total is unavailable until all five are supplied and then equals their sum out of 50.
- Descriptor selection does not affect the total.
- Coffee details are optional.
- Partial and complete tastings can be saved, reopened, edited, and deleted; history remains newest-first after reload.
- Saved profile name snapshots remain readable if a source profile is renamed or removed.
- Storage failures and malformed data are reported without silently claiming success or overwriting the original data.
- Unit and browser tests cover score calculation, total gating, descriptor behavior, profile options, persistence, edit/delete, and responsive rendering.