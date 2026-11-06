# Lotus Selector Alignment Design

## Goal

Remove the uneven sizing and duplicated status badges in the Lotus dropper selector while keeping its current controls and calculations unchanged.

## Design

- Keep the dropper selector and selected-mineral summary side by side on wider screens, with matching labels, aligned tops, and equal minimum heights.
- Keep the mineral name, formula, hydration form, and optional “Bonus · not Lotus” marker together inside the selected-mineral card.
- Remove the separate calibration badge beside the mineral card. Show the selected tip’s calibration status only in the collapsible calibration header.
- Keep the Straight/Round selector full-width beneath the two fields. On narrow screens, stack the fields without clipping or horizontal overflow.

## Behavior and scope

This is a layout-only change. Dropper selection, calibration state, stock calculations, ppm references, and preparation steps remain unchanged.

## Acceptance criteria

- The selector and mineral summary have matching label alignment and visual height.
- No status badge floats outside its related card; calibration status appears once.
- The optional Epsom marker remains readable within the mineral summary.
- The layout remains usable at phone widths and preserves keyboard-accessible controls.
