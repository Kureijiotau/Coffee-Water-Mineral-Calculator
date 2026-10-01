# Watermancer Pairwise Ion-Ratio Display

## Goal

Let users inspect two direct ion relationships in Watermancer’s **Current ion
readings** as an alternative to the existing combined monovalent-to-divalent
percentage:

- **K relative to Mg:** `potassium ÷ magnesium × 100`
- **Na relative to Ca:** `sodium ÷ calcium × 100`

This is a display option only. It must not change ion targets, salt selection,
dose calculations, or Watermancer matching.

## Current behavior

- Compact and Classic Current ion readings each show the combined
  `(Na + K) ÷ (Mg + Ca) × 100` relationship.
- The combined percentage is calculated from the same ion basis used by the
  other live readings: modeled final ions when available, otherwise selected
  target ions for preview.
- The combined display includes the Na + K ppm total and existing severity
  coloring.

## Display and interaction

- Add a compact, inline control that switches between **Pairwise** and
  **Combined** views of this relationship.
- In Pairwise view, show **K ÷ Mg** and **Na ÷ Ca** side by side, each as a
  percentage with one decimal place. Preserve the requested order: K relative
  to Mg first, then Na relative to Ca.
- In Combined view, retain the existing `(Na + K) relative to (Mg + Ca)`
  percentage, ppm total, and severity treatment unchanged.
- Make the same view available in both Compact and Classic readings. Keep the
  selected view consistent when switching between those layouts for the
  current Watermancer session.
- Use the same live or preview ion basis as the existing combined percentage.
  Pairwise values are read-only and do not participate in target selection or
  matching.
- If a pair’s denominator is zero or its result is not finite, show `—` for
  that pair. A valid other pair remains visible.

## State and calculation boundary

- Derive both pairwise percentages from the existing selected `ratioIons`
  values; do not add a separate chemistry or target calculation.
- Keep the combined calculation and formatting unchanged.
- Keep the display choice as UI state shared by Compact and Classic views; it
  does not need to be saved to a profile or synchronized between devices.
- Do not alter existing ratio-order swap controls or their persisted behavior.

## Accessibility and responsive behavior

- Give the selector a clear accessible group label and expose the selected
  option with pressed/selected state.
- Ensure both pair labels and values remain understandable without color, are
  keyboard operable, and have visible focus.
- Keep the two pairwise values side by side when space allows; allow wrapping
  rather than clipping on narrow screens.

## Acceptance criteria

- Pairwise view displays K ÷ Mg and Na ÷ Ca as percentages in that order in both
  Compact and Classic readings.
- Combined view preserves the current combined percentage, ppm total, and
  severity behavior.
- Switching layouts preserves the selected relationship view.
- Preview values use selected target ions; modeled readings use the same live
  ions as the existing combined metric.
- A zero denominator or non-finite result displays `—` only for the affected
  pair.
- Toggling the display has no effect on targets, matching, salt choices, or
  dose calculations.