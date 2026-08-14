# Concentrate Style Chooser

## Goal

Make the recipe concentrate setup immediately communicate the three ways a
user can prepare their stocks:

1. **GH + KH** — recommended compatible grouping.
2. **All-in-one** — easiest single-bottle path.
3. **Separate salts** — advanced one-bottle-per-salt control.

## Interaction

Replace the previous two-state “Stock layout” toggle with three large,
keyboard-accessible strategy cards. Each card has a distinct glyph, badge,
short explanation, and selected state. The existing strength and final-batch
controls remain below the strategy chooser.

The selected strategy controls the existing stock-group calculation:

- GH + KH retains the chemistry engine’s compatible hardness, alkalinity, and
  citrate grouping.
- All-in-one creates one group containing every active salt and surfaces a
  visible mixing caution.
- Separate salts preserves one group per active salt.

The downstream stock cards update their heading, count, and labels to match the
selected strategy. Existing salt calculations, warning checks, volume inputs,
and recipe handoff behavior remain unchanged.

## Verification

Run the full test suite, typecheck, production build, diff check, workflow
restart, and preview verification.