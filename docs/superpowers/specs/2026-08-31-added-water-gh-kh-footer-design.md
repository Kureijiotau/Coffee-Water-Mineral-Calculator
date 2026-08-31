# Added-water GH:KH footer

## Goal

Make the hardness balance of each added water visible directly in its card,
without changing Watermancer calculations, targets, or saved-water data.

## Design

Each added-water card will render a compact footer beneath the ion fields and
above the collapsed reported-metadata section. The footer will show the
individual water's derived GH, derived KH, and `GH:KH` ratio.

The values will be computed from that card's own ion profile with the shared
`computeGH` and `computeKH` helpers. GH will use the existing magnesium color
and KH will use the existing bicarbonate color from the ion-reading card. The
ratio will use the established `GH : KH` presentation and two decimal places,
ending in `: 1`. If KH is zero, the footer will retain the existing em-dash
behavior and omit the numeric ratio rather than divide by zero.

## Scope and behavior

- Apply the footer to each rendered mineral-water card, including newly added
  waters and edited volumes.
- Do not use combined recipe ions or final mixture ions for the per-water
  values.
- Do not add a new persisted field; the display is derived at render time.
- Keep the current card controls, ion inputs, metadata disclosure, save action,
  and share action unchanged.
- Keep the footer readable on narrow screens and consistent with the current
  dark instrument-console styling.

## Verification

- Typecheck the calculator package.
- Run the calculator test suite.
- Restart the calculator workflow and confirm clean startup.
- Inspect the rendered card at desktop and narrow viewport sizes.