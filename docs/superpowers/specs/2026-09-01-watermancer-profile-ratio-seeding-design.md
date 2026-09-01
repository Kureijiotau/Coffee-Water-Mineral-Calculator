# Watermancer Profile Ratio Seeding

## Goal

When the user opens the standalone Ion ratios page with **Set ion ratios**, use
the currently selected Watermancer profile values as the ratio page's starting
values instead of always using the hardcoded ratio defaults.

## UX behavior

- Clicking **Set ion ratios** always refreshes the ratio draft before opening
  the standalone page, including when the user is already on that page.
- The profile snapshot captured by **Set ion ratios** becomes the reset
  baseline for that page visit.
- **Reset ratios** restores that captured snapshot after manual exploration.
- When a Watermancer target profile is selected, seed:
  - Mg, Ca, Cl, SO₄, Na, and K from the active profile target values.
  - GH and KH from the same profile target ion set using the existing chemistry
    calculations.
- A missing profile ion is seeded as `0`, not as the hardcoded ratio default.
- If no Watermancer profile is selected, retain the existing hardcoded ratio
  draft.
- Relationship fields are recalculated from the seeded first and second values.
- The seed action only prepares the ratio draft. It does not change
  Watermancer targets or import values back into Watermancer.
- The selected orientation starts unswapped, matching the profile's canonical
  ion order.

## Data flow

The Watermancer parent owns the active target source and target ion values. Its
**Set ion ratios** handler creates a fresh `IonRatioDraft` from the current
profile-backed target set, then changes `appTab` to `ion-ratios`. The standalone
ratio table continues to own edits after it opens, so manual ratio changes are
not overwritten by ordinary rerenders.

The profile seed uses the same `computeGH` and `computeKH` functions as the
Watermancer summaries. Direct ion values are normalized to finite,
non-negative numbers and default to zero when absent.

## Error handling and boundaries

- Zero values remain valid ion values, but a zero second value leaves that row
  with the existing relationship validation message.
- Existing hardcoded defaults remain the no-profile fallback.
- Existing explicit **Import to Watermancer** behavior is unchanged.
- Existing swapped-row persistence is unchanged; a fresh profile seed begins
  in canonical order.

## Testing

Add focused model tests for:

1. Building a profile-seeded draft with all direct ions present.
2. Filling absent direct ions with zero.
3. Calculating GH/KH from the seeded ion set.
4. Resetting the standalone page from a newly selected profile on each button
   click.
5. Preserving the existing no-profile default behavior.
6. Restoring the captured profile snapshot after manual ratio edits.