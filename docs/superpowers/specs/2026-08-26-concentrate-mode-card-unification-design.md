# Concentrate Mode Card Unification

## Goal

Make the GH + KH and Single salts tabs use the same focused, repeatable bottle-card language as the existing All-in-one concentrate view, while preserving the chemistry meaning of each mode.

## Selected interaction

### GH + KH

Render one full bottle card for each active compatible stock group, stacked vertically:

- Hardness Stock
- Alkalinity Stock

Each card contains:

1. Prepare concentrate
2. Stock strength and bottle volume
3. Salt-to-weigh and water-to-add results
4. Dropper style and optional measured calibration
5. Dose the final water
6. Final-water volume with metric/US-gallon toggle
7. Dose result expressed as drops and stock milliliters

The group cards use distinct but coordinated color accents. A concise combined dosing summary may sit above or below the cards when it improves scanning, but it must not replace the per-group dose values.

### Single salts

Render one full bottle card per active salt, stacked vertically. Each card uses the same internal structure as GH + KH:

- Prepare concentrate
- Strength and bottle volume
- Salt-to-weigh and water-to-add
- Dropper setup and calibration
- Dose the final water
- Drops / mL result

Each salt card receives a stable salt-specific accent color. The recipe lineup remains visible so the user can scan all active salts while each bottle's detailed controls remain self-contained.

## Shared behavior

- The final-water amount is controlled in liters or US gallons, with the same conversion behavior in every card.
- Changing final-water volume recalculates the corresponding dose without changing stock preparation amounts.
- Changing stock strength or bottle volume recalculates only that bottle's preparation and dose values.
- Dropper style and measured calibration affect dose conversion, not recipe chemistry.
- Strength is capped at the modeled safe ceiling for the active group or salt.
- Existing All-in-one behavior remains unchanged.

## Implementation boundary

Use a small data-driven card renderer in the existing mockup rather than duplicating three independent layouts. The mockup remains isolated in the sandbox; production calculator integration is out of scope for this design pass.

## Verification

- Typecheck the mockup sandbox.
- Render All-in-one, GH + KH, and Single salts at desktop and mobile widths.
- Confirm the tab switch changes content rather than only the selected tab styling.
- Confirm liters/gallons conversion and drops / mL output remain coherent in each mode.
- Confirm the canvas frame remains live and retains three suggested actions.