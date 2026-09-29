# Prevent Long-Press Menus on Adjustment Buttons

## Status

Design approved by the user on 2026-09-29. Awaiting review of this written spec.

## Context and goal

When the desktop-oriented calculator is used on a phone, long-pressing an increment or decrement button can select its `+` or `−` symbol and open the browser context menu. Prevent that browser behavior on adjustment buttons while preserving the existing button interactions.

## Scope

Apply the behavior to all actual numeric adjustment steppers:

- The plus/minus controls around `VolumeInput` values in `App.tsx`.
- The water-volume controls that repeat while held.
- The `HoldStepperButton` controls used for Watermancer salt doses.
- The direct dose controls in `WaterMixer.tsx`.

Do not apply it to buttons that use a plus icon to add a new item, or to other page content.

## Proposed behavior

- Adjustment buttons do not allow their symbol or icon to be selected.
- Long-press callouts and context menus are prevented on those buttons only.
- A normal tap still changes the value once.
- Existing hold-to-repeat behavior, pointer capture, keyboard focus, disabled states, and accessible labels remain unchanged.
- Text selection and browser context menus continue to work elsewhere, including on surrounding labels and inputs.

## Implementation outline

Add a reusable CSS class in `src/index.css` that applies `user-select: none`, the WebKit selection equivalent, and `-webkit-touch-callout: none`. Add a context-menu handler that calls `preventDefault()` only on the scoped adjustment buttons in `App.tsx` and `WaterMixer.tsx`. No calculation, state, or timing logic changes are needed.

## Validation

- Run the calculator typecheck and unit tests.
- At a mobile browser viewport, verify the adjustment buttons use the non-selectable style and cancel their context-menu event.
- Verify tapping still adjusts once and holding still repeats on the hold-enabled controls.
- Verify context menus and text selection remain available on nearby non-button content.