# Editable all-in-one drop contribution

## Goal

Let users set the physical salt ppm delivered by one drop of an all-in-one
concentrate, while keeping the finished bottle volume unchanged and updating
all dependent preparation and dosing values immediately.

## Design

The existing `1 drop adds` metric in the all-in-one recipe bottle card becomes
an editable numeric control. Its value remains based on physical salt mass per
drop divided by the selected final-water volume; it does not switch to
salt-equivalent ppm.

When the user enters a positive value, it becomes a pinned drop-contribution
target. Stock strength is solved inversely from that target using the current
recipe proportions, hydration forms, active dropper rate, and final-water
volume. Bottle volume is not changed. Salt-to-weigh, water-to-add, dose
volume, dose drops, per-salt drop contributions, and safety warnings all
recalculate from the resulting strength.

While the target is pinned, later changes to final-water volume, dropper style,
or measured drops per milliliter adjust stock strength to preserve the requested
physical ppm per drop. Editing stock strength directly, including the slider or
Apply maximum action, clears the pin and returns `1 drop adds` to a calculated
readout.

## Persistence and compatibility

Store the optional override in the concentrate session snapshot so it survives
session save/restore and full-plan export. Older snapshots without the field
remain valid and use the existing calculated behavior. The saved value is an
input string so partially edited fields do not lose their UI state.

If the requested target requires a strength above the modeled chemical ceiling,
keep the exact requested target and show the existing above-ceiling warning
instead of silently clamping it.

## Verification

- Add unit coverage for the inverse strength calculation.
- Add coverage for preserving the requested physical ppm when final-water volume
  or dropper rate changes.
- Run typecheck, the complete calculator test suite, and a production build.
- Restart the calculator workflow and confirm clean startup.