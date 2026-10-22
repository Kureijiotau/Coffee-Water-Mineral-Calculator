# Water Tasting Profile Mineral Analysis

Date: 2026-10-22

## Goal

Show the mineral analysis for the water profile selected in Water Tasting, so a user can review the water chemistry alongside the tasting they are recording.

## Design

- Render the existing profile-analysis card directly below the Water profile selector.
- Show it only when the selected source ID matches an available profile option. Do not show an empty card before selection or for an unavailable legacy profile.
- Reuse the existing `renderProfileAnalysis(sourceId)` callback and `MineralAnalysisLabel`. Keep calculations in the parent that already owns the profile readings.
- Update the card in place when the user selects a different Alchemist or Watermancer source.
- Keep the change display-only: it must not modify targets, profile snapshots, tasting scores, or saved records.

## Alternatives

- A collapsible card would reduce the form's initial height, but would hide analysis behind an extra interaction.
- A compact replacement summary would require a second rendering path and duplicate or diverge from the existing mineral-analysis card.

The inline existing card is preferred because it reuses the established analysis component and keeps the selected water's readings visible in context.

## Verification

- Exercise the card with the safe profile, salt table, current Alchemist setup, and saved Watermancer profiles.
- Confirm the card updates with the selected source, includes expected readings, and never renders `NaN`.
- Update the old zero-panel assertion to match the approved visible-card behavior.
- Run the Water Tasting E2E spec, calculator unit tests, and workspace build/typecheck.
