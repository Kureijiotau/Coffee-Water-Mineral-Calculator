# Watermancer Live GH, KH, and TDS Readings

## Goal

Add absolute GH, KH, and modeled TDS readings to both layouts of Watermancer’s
**Current ion readings** panel. The values must use the same source and
calculations as the **Review match — Final mixture** card, while allowing users
to inspect profile targets and the modeled final mixture separately.

## Current behavior

- Compact readings show each ion’s current and target concentration in a
  horizontal live rail.
- Classic readings show the full ion breakdown. Both layouts show relationship
  ratios, including GH:KH, but not absolute GH, KH, or TDS summary values.
- The Review match card shows GH, KH, and TDS for both target ions and the
  modeled final mixture.
- In preview, before there are modeled ions, Current ion readings use profile
  targets to provide a useful baseline.

## Metric definitions

Use the same formulas and ion sets as Review match:

- **GH:** `computeGH` applied to the selected target or final-mixture ions,
  shown in ppm CaCO₃.
- **KH:** `computeKH` applied to the selected target or final-mixture ions,
  shown in ppm CaCO₃.
- **Modeled TDS:** the sum of the same selected ion concentrations used by
  Review match, shown in mg/L. Label it as modeled; it is not a
  conductivity-meter measurement.

## Display and interaction

- Show GH, KH, and modeled TDS in both Compact and Classic Current ion readings
  layouts.
- When there are no modeled ions, show the selected target profile’s values as
  a target preview.
- When modeled ions exist, offer a **Targets / Final mixture** selector:
  - **Targets** shows the active Watermancer ion targets.
  - **Final mixture** shows the selected-water-plus-salts result, matching
    Review match.
  - Default to Targets in preview and Final mixture when a modeled mixture is
    available.
- Keep the selection shared when switching between Compact and Classic views.
  A user’s selection remains in effect while the current preview/model state
  remains unchanged.
- Keep the existing individual ion rows, target comparisons, ratio behavior,
  and Review match card unchanged. This is a read-only display addition and
  does not affect matching or dosing.

## State and implementation boundary

- Derive metric values from the existing target and actual ion values; do not
  introduce a second chemistry implementation or persist this UI selection.
- Reuse or extract the existing GH, KH, and modeled-TDS calculations so
  Current ion readings cannot drift from Review match.
- Keep preview detection aligned with the existing `hasModeledIons` behavior.

## Accessibility and responsive behavior

- Give the source selector an accessible group label and clear pressed/selected
  state.
- Keep metric labels, values, and units visible at mobile and desktop widths.
- Retain keyboard operation and visible focus for the selector.
- Do not rely on color alone to distinguish Targets and Final mixture.

## Acceptance criteria

- Compact and Classic readings each show GH, KH, and modeled TDS with the units
  used by Review match.
- Preview shows target-profile values and does not misrepresent them as a
  modeled final mixture.
- With modeled ions present, users can switch between targets and final-mixture
  values in either view, and the selected source remains consistent when
  switching views.
- Values match Review match for the same target and final-mixture ion inputs,
  including mixed water-plus-salt cases.
- The TDS label clearly identifies the value as modeled, not meter-reported.
- Existing ion values, ratio calculations, matching, and dosing are unchanged.