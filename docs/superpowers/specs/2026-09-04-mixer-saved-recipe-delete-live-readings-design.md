# Mixer saved-recipe deletion and live final readings

**Status:** Approved for implementation

## Goal

Improve the Mixer editing flow in two focused ways:

1. Let users delete personal saved Mixer recipe snapshots safely.
2. Keep the changing final mineral readings visible while users scroll through and edit final-blend salts.

The existing Mixer calculation model, recipe format, source catalog, and full Blend output panel remain the source of truth.

## User experience

### Saved recipe deletion

Each personal card in **Saved Mixer recipes** gains a `Delete` action beside `Reopen`.

Deletion requires an in-app confirmation dialog. The dialog names the recipe and explains that it removes only the saved Mixer snapshot. It offers:

- `Cancel`: close the dialog and make no changes.
- `Delete recipe`: remove the snapshot.

Deletion is limited to locally saved Mixer recipes represented by `storedRecipes`. Built-in waters, community waters, Watermancer profiles, and imported recipe sources remain read-only or independently managed.

After confirmation:

- Remove the recipe from local storage.
- Update the visible saved-recipe list immediately.
- Remove it from the eligible saved-source picker options.
- If Water A or Water B currently points to that saved recipe, clear that source card. The current salt settings remain untouched, but the blend becomes incomplete until a replacement source is selected.
- Show a short success status without blocking the rest of the Mixer.

If local storage fails, preserve the current in-memory list only if the existing persistence boundary allows it and show an explicit error status. Do not silently report deletion as persisted.

### Live final readings

Keep the existing full **Final readings** section in the Blend output panel.

Add a compact sticky **Live final readings** rail beside the salt table on wide screens. The salt table remains the main editing surface on the left, while the readings rail stays pinned in the right column during salt editing. On smaller screens, the rail stacks above the salt table. It uses the already-computed `result.finalIons` and derived values, so it updates on every existing Mixer calculation change:

- Water A or Water B source changes
- Water A or Water B volume changes
- Salt added or removed
- Salt dose changes
- Hydration-form changes

The rail displays all modeled active ions plus modeled TDS in a compact two-column instrument-console treatment. The mobile layout preserves the same values without hiding readings or changing the calculation.

The strip must communicate incomplete state clearly. Before the blend is valid, it shows the live-readings label and a concise prompt to choose both finished sources and valid volumes instead of showing stale values.

## Architecture and data flow

### Persistence

Add a focused deletion helper at the existing `waterMixer.ts` persistence boundary. It loads and migrates the current recipe list, filters by stable recipe ID, writes the normalized remaining list, and returns the resulting list for the UI.

`WaterMixer.tsx` owns the confirmation state and calls the helper after explicit confirmation. The existing `storedRecipes` state is updated from the helper result, so the saved list and source picker recalculate through the existing `eligibleSources` memo.

The deletion path must compare recipe IDs, not display names. Same-name recipes with different IDs remain independent.

### Current-source safety

When a confirmed deletion matches either active saved-recipe source, clear only the matching source card through the existing source reset boundary. Do not delete imported sources or Watermancer profile data that may have a separate owner.

### Readings presentation

Create a small presentational component for the sticky readings rail rather than duplicating ion formatting in the page body. It receives:

- `result.valid`
- `result.finalIons`
- `result.tds`
- the active ion metadata used by the existing `IonReading`

The component has no calculation or persistence behavior. It reuses the same values and formatting rules as the full result panel.

The sticky rail should remain within the Mixer document flow and use a restrained z-index/background so it can follow the salt editing area without covering controls permanently. The full output panel remains available near the top for users who want the detailed result view.

## Accessibility and interaction details

- Delete buttons have accessible labels containing the recipe name.
- The confirmation dialog uses `role="dialog"` and `aria-modal="true"`, has a programmatic name, and supports Escape to cancel.
- Focus moves to the dialog’s safe action on open and returns to the triggering delete button on close when possible.
- The live strip is informational, not a live-region announcement for every numeric keystroke; frequent numeric updates should not interrupt screen-reader users.
- Sticky readings remain keyboard-readable and are presented above the salt table on narrow screens.
- Personal deletion controls are not rendered for catalog or shared sources.

## Error and empty states

- With no saved recipes, keep the existing empty behavior and do not render an empty saved-recipe section.
- If deletion is cancelled, no success message is shown.
- If deletion succeeds, show a concise confirmation status and remove the card immediately.
- If persistence fails, keep the recipe visible and show an error explaining that it was not deleted from saved storage.
- If the Mixer is incomplete, the live strip shows an incomplete prompt and never displays readings from a previous valid blend.

## Testing

### Unit coverage

- Deleting a recipe removes only the matching ID from persisted recipes.
- Same-name recipes with different IDs are not merged or co-deleted.
- A missing ID leaves the persisted list unchanged.
- Recipe migration and validation still apply through the deletion boundary.

### Component/browser coverage

- Saved cards render a Delete control with the recipe name.
- Canceling the confirmation leaves the card and picker option intact.
- Confirming deletion removes the card and picker option.
- Deleting the active Water A or Water B saved recipe clears that source and makes the result incomplete.
- Catalog and imported sources do not expose the saved-recipe Delete control.
- The live readings rail is visible beside the salt table for a valid desktop blend.
- Toggling a salt, changing its dose, and changing its hydration form updates the live final readings.
- The strip shows the incomplete state when a source or volume becomes invalid.
- The strip remains usable at a narrow viewport.

## Scope boundaries

This change does not:

- alter the chemistry engine or salt calculations;
- change the saved recipe/export file format;
- delete Watermancer profiles or imported recipe files;
- replace the existing detailed result panel;
- add a new backend or database dependency.