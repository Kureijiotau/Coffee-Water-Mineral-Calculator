# Watermancer silica target design

## Scope

Apply the new Use/Not used and target behavior to the existing silica supplement only. Do not add controls for other ions or salts. Silica remains a supplemental reading outside the core-ion solver and GH/KH calculations.

## Interaction

- Show silica's ppm value in the top ion card with the same numeric hierarchy, tabular alignment, and ppm treatment used by the core readings.
- Add a silica-only Use/Not used control to that card.
- When Used, show an editable silica target in ppm. The target is the source of truth for the silica dose: calculate the nearest whole drop for the current batch volume using 12.5 mg SiO₂ per drop.
- Recalculate the whole-drop dose when either the target or batch volume changes.
- While Used, the existing dropper stepper moves the target to the ppm represented by the adjacent whole-drop dose. This keeps the target, dose, and displayed reading consistent.
- When Not used, exclude silica from target matching and keep the existing dropper control manual.

## Persistence and compatibility

- Persist the Used state and target with Watermancer session/plan snapshots.
- Older saved sessions default to Not used and retain their existing silica drop count, preserving the current manual workflow.
- Turning Use off preserves the entered target and dose so turning it back on can resume target-based dosing.

## Verification

- Cover target-to-whole-drop conversion, volume changes, and stepper-to-target synchronization.
- Verify old snapshots restore as Not used without changing their drop count.
- Verify only silica exposes these controls and its target does not enter core-ion matching or GH/KH.
- Confirm the 25 ppm display matches the formatting and alignment of neighboring ion readings.