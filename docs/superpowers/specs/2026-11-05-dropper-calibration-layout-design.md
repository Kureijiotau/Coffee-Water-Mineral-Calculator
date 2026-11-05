# Dropper Calibration Placement and Saved State

## Goal

Make dropper calibration easier to find and make previously saved calibration visible without requiring users to reopen a large section every time.

## Approved behavior

- In the DIY single-salt workspace, place the shared dropper calibration panel immediately after the mineral and hydration-form selectors.
- Leave calibration placement in recipe and Lotus workspaces unchanged in this update.
- Show a checkmark and a “Calibrated” status when at least one tip style has a valid saved shared calibration.
- On a later workspace open, collapse the shared calibration panel if at least one style was already calibrated. If no style has a valid saved calibration, keep the panel expanded.
- Treat a calibration as valid only when its saved drop count and measured water weight are both finite and greater than zero.
- Use saved calibration data as the source of truth; do not add a separate completion checkbox.
- Keep finished-stock calibration attached to its stock, since those measurements depend on the stock composition and tip.

## Data and behavior

Shared straight- and round-tip values already persist in the DIY concentrate inputs and are synchronized through the existing account-sync path. The DIY single-salt workspace should determine saved status from those values when it opens. It should not auto-collapse while the user is entering a calibration; the initial expanded/collapsed state is based on the values present at mount time.

When only one tip style is calibrated, the panel may start collapsed, but the selected style’s existing estimated/shared metrics must remain accurate when the panel is expanded. No dose formulas or finished-stock calibration behavior change.

## Verification

- Verify the calibration section appears directly below the mineral and hydration selectors in the DIY single-salt view.
- Verify it opens by default with no valid saved calibration and starts collapsed when either tip style has a valid saved calibration.
- Verify incomplete, zero, or invalid measurements do not mark calibration as complete or collapse the panel.
- Verify the checkmark/status distinguishes saved calibration availability from the currently selected tip’s measured or estimated rate.
- Verify recipe and Lotus calibration placement is unchanged, while finished-stock calibration remains available per stock.
- Run relevant unit tests, browser tests, typecheck, and production build.
