# Calcium Lactate Integration Design

## Goal

Integrate Calcium Lactate into the shared salt model, place it immediately after
Calcium Chloride in the salt list, and make pentahydrate its default hydration
form.

## Chemistry model

Calcium Lactate will have two hydration forms:

- Anhydrous
- Pentahydrate (default)

Its salt contribution will include calcium in the existing ion model and lactate
as a supplemental display-only ion. Lactate will not be added to the active ion
set used by Watermancer targets, automatic matching, Aiki’s monitored ranges,
GH/KH, or solver ranking.

## UI behavior

The first Watermancer ion profile card will continue to render the existing
active ions. A Lactate card will be appended only when the current salt target
map contains a positive Calcium Lactate dose. The card will show the calculated
lactate concentration and will not expose a target or ceiling input. It will
disappear when the Calcium Lactate dose returns to zero.

Because the salt is added to the shared `SALTS` list, existing salt rows,
hydration selectors, recipe displays, concentrate calculations, and dose
exports will inherit it. Its position will be directly after `cacl2`.

## Data flow

The existing salt-dose calculation remains the source of truth. Calcium Lactate
uses the selected hydration form when converting an anhydrous-equivalent target
to physical mass. Calcium enters `computeIonTotals`; lactate is computed from
the same target and its salt-specific fraction for the conditional Watermancer
display.

## Testing

Add regression coverage for:

1. Calcium Lactate ordering immediately after Calcium Chloride.
2. Pentahydrate being the default hydration form.
3. Calcium contribution using the existing ion-total calculation.
4. Lactate contribution being available separately without expanding the active
   solver ion set.
5. Positive-dose conditional display data and zero-dose omission behavior.
