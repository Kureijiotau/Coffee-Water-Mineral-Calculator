# Finished Water Mixer

**Date:** 2026-09-03  
**Status:** Design approved for specification review

## Summary

Add a dedicated **Mixer** workspace to Coffee Water Calculator. The Mixer combines two already-finished waters by volume and reports the final ion readings for the combined batch. It is a composition tool, not a salt solver: it must never reinterpret the inputs as salt targets or silently run Watermancer matching.

The first version supports:

- Water A and Water B source cards.
- Selecting a finished recipe from the app.
- Selecting a water from the existing water database picker.
- Entering final ion readings manually.
- Independent A and B volumes in mL.
- Live volume-weighted final readings.
- A recipe-steps-style result card.
- Saving a calculated blend as a reusable Mixer recipe.

The existing Alchemist default and Watermancer target/matching behavior remain unchanged.

## Goals

1. Let a user answer “What happens if I mix these two finished waters?”
2. Make water-database selection as easy as selecting a saved source.
3. Keep the output visually consistent with the existing recipe steps card and final analysis panel.
4. Preserve source snapshots in saved blends so a saved result remains reproducible even if a database entry later changes.
5. Keep the chemistry calculation deterministic, testable, and independent from React rendering.

## Non-goals

- Re-solving salts for the mixture.
- Matching a Watermancer target.
- Recommending whether a blend is “correct” for a coffee.
- OCR or image recognition of photographed recipe cards.
- Expanding the first version beyond two source waters.
- Replacing or restructuring the existing water database.

## User experience

### Workspace entry

Add **Mixer** to the workspace navigation alongside Brewer, Alchemist, Watermancer, and Concentrate. The app continues to open in its existing default workspace. Switching away from Mixer must not delete its current draft; switching back restores the draft for the current session.

The workspace opens with a short explanation:

> Combine two finished waters by volume and see the final mineral readings.

### Source cards

Render two parallel cards labeled **Water A** and **Water B**. Each card contains:

- A source-type selector:
  - **Saved recipe**
  - **Water database**
  - **Enter readings**
- The selected source name and provenance.
- A compact preview of its available final readings.
- An editable volume field in mL.
- A clear/reset action that returns the card to an empty source state.

Both cards may use the same source. Empty cards are allowed while the user is setting up a blend, but the result stays in an incomplete state until both sources have valid readings and the total volume is greater than zero.

### Saved recipe sources

The saved-recipe picker must only offer sources that represent a finished water with final readings. A salt-only recipe target is not itself a finished water and must not be treated as one. Eligible sources may include a saved Water Plan or a recipe-card payload that carries final ion readings.

If a saved item cannot provide final readings, keep it out of the eligible list or explain inline that it needs a finalized water result first. Do not silently fall back to salt-only metrics.

Target-only Watermancer profiles are not finished waters and are not source options in the Mixer.

### Water database sources

Reuse the existing water database behavior and picker rather than creating a second catalog:

- Fetch shared/community waters through the existing on-demand database request.
- Include the user’s locally saved waters in the same picker.
- Preserve the existing search and source/provenance labeling conventions.
- Show loading, empty, and unavailable-database states.
- Selecting a database water copies its current ion and metadata snapshot into the Mixer source.

The Mixer does not mutate database entries. A selected source remains usable if the API later becomes unavailable during the same session because its snapshot is already in the draft.

### Manual readings

The manual source form uses the same active mineral-ion labels, formulas, ordering, units, and validation conventions as the existing final-reading surfaces. Values must be finite and non-negative. Blank optional ions are treated as zero only where the existing water-reading model treats an omitted ion as zero; required/core readings remain visibly incomplete until entered.

Manual readings may have a user-provided source label, such as “My filtered water.”

### Blend controls

Each source has an independent editable volume:

- Water A: `A mL`
- Water B: `B mL`

The total volume is `A + B`. Volumes must be finite and greater than or equal to zero, with a positive total required to calculate. A zero-volume source contributes nothing but remains visible in the recipe steps so the user can understand the current setup.

The UI may show each source’s percentage as secondary context, but the editable controls remain the two mL fields selected by the user.

## Calculation model

Create a pure Mixer calculation module with a small public interface:

```ts
type WaterMixSourceSnapshot = {
  name: string;
  sourceKind: 'saved-recipe' | 'database' | 'manual';
  sourceId?: string;
  ions: Record<IonId, number>;
  metadata?: WaterMetadata;
};

type WaterMixInput = {
  sourceA: WaterMixSourceSnapshot;
  sourceB: WaterMixSourceSnapshot;
  volumeAMl: number;
  volumeBMl: number;
};
```

For every active mineral ion:

```text
finalIon = (volumeAMl × sourceAIon + volumeBMl × sourceBIon)
           ÷ (volumeAMl + volumeBMl)
```

The implementation must calculate missing ion keys as zero only according to the established water-ion normalization rule, keep zero-target/zero-valued ions meaningful, and never round before the final display layer.

Use existing helpers for derived values:

- GH from the combined final ion map.
- KH from the combined final ion map.
- TDS according to the existing final-reading card convention.

If source metadata includes reported TDS, preserve the distinction between reported TDS and modeled summed-ion totals. Do not label a modeled ion sum as a meter reading.

The calculation result should include:

- Total volume.
- A/B volumes and percentages.
- Combined final ions.
- Derived GH, KH, and TDS values.
- A validity state and user-facing validation messages.

## Result presentation

When valid, render a recipe-steps-style result card:

1. **Add X mL Water A**
2. **Add Y mL Water B**
3. **Final volume: Z mL**

Place the final readings panel beside or immediately below it using the same ion rows, formulas, colors, GH/KH cards, TDS treatment, and responsive behavior as the current recipe steps result. The result must update immediately when either volume or source reading changes.

When incomplete, keep the result area in place with a clear state such as:

- “Choose Water A and Water B to calculate a blend.”
- “Enter final readings for Water B.”
- “Add a positive volume to calculate the final mixture.”

Do not show stale readings after a source or volume becomes invalid.

## Saving and reopening

Add a dedicated persisted Mixer recipe shape rather than forcing a finished blend into the existing salt-only `SaltRecipe` type:

```ts
type WaterMixRecipe = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sourceA: WaterMixSourceSnapshot;
  sourceB: WaterMixSourceSnapshot;
  volumeAMl: number;
  volumeBMl: number;
  finalIons: Record<IonId, number>;
  finalMetadata?: WaterMetadata;
};
```

Persist recipes using the app’s established local-storage validation conventions. Saving opens a name prompt or inline name field, rejects blank names, and shows a success state. Reopening a saved blend restores both source snapshots and the editable volumes; it does not depend on a live database lookup to render the saved result.

The saved recipe should be available in the Mixer’s saved-recipe picker and should not appear as a salt recipe in Alchemist.

## Data flow and boundaries

1. Mixer source selection resolves a source into a normalized `WaterMixSourceSnapshot`.
2. Database selection uses the existing shared-water request and local-water storage.
3. The pure calculation module receives only normalized source snapshots and numeric volumes.
4. The result presenter consumes the calculation result and existing final-analysis presentation helpers.
5. Saving serializes the source snapshots, volumes, and result metadata into the dedicated Mixer storage collection.

No API or database schema change is required for the first version. The existing water endpoint remains the source for shared/community database entries.

## Error handling and accessibility

- Treat malformed saved Mixer records as invalid and skip them during load.
- Keep API failures local to the database picker; manual and saved-source modes must remain usable.
- Validate volume fields with numeric input semantics and clear inline messages.
- Never allow `NaN`, infinity, negative readings, or division by zero into the calculation.
- Give every source selector, volume field, clear action, save action, and result status an accessible label.
- Keep the two sources distinguishable without relying on color alone.
- Respect the existing reduced-motion behavior for result updates and attention cues.
- Preserve keyboard navigation through source selection, picker search, readings, volumes, and save controls.

## Testing

### Pure calculation tests

- Equal volumes average every ion correctly.
- Unequal volumes weight the result toward the larger source.
- One zero-volume source leaves the other source unchanged.
- Zero-valued ions remain present and calculate as zero.
- Total volume zero returns an invalid result without division by zero.
- Negative, non-finite, and incomplete inputs return explicit validation errors.
- GH, KH, and TDS use the established helpers/conventions.
- Source metadata and provenance remain attached to the normalized snapshots.

### Persistence tests

- Valid Mixer recipes load and round-trip.
- Malformed records are rejected.
- Saved source snapshots remain usable without a database response.
- Blank names are rejected.

### UI/browser coverage

- Mixer appears in workspace navigation without changing the existing default.
- Both source cards support saved recipe, database, and manual modes.
- Database picker loading, empty, search, and selection states work.
- Changing A or B mL updates the final result and recipe steps.
- Invalid or incomplete inputs do not display stale final readings.
- Saving and reopening a blend restores source names, readings, and volumes.
- The current Watermancer and Alchemist workflows remain unchanged.

## Spec self-review

- **No unresolved placeholders:** no TBD/TODO items remain.
- **Consistent chemistry boundary:** the Mixer only combines finished readings and never invokes salt matching.
- **Consistent persistence boundary:** finished blends use a dedicated type and storage collection instead of the salt-recipe schema.
- **Database scope is explicit:** shared/community and local waters reuse the current picker; no duplicate endpoint or new database model is introduced.
- **Incomplete recipe behavior is explicit:** salt-only recipes and target-only profiles cannot be silently interpreted as finished water.
- **First-version scope is bounded:** exactly two waters, independent mL inputs, no OCR, no multi-water editor.