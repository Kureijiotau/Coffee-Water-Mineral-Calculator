# Unified Concentrate Language and Visual Grammar

## Goal

Make the Stock Builder, imported-recipe concentrate flow, and DIY Lotus Drops
feel like parts of the same Concentrate workspace while preserving their
different calculations and levels of explanation.

The unification is presentation-first. It should improve recognition when a
user moves between concentrate tabs without merging the stock-builder and
Lotus state models.

## Design principles

- Keep the existing Stock Builder, imported-recipe, and DIY Lotus workflows.
- Reuse the same glyphs, card shapes, field treatments, section spacing, and
  summary metric patterns wherever the content maps naturally.
- Use sentence-case, user-facing labels based on what the user controls:
  **Plan**, **Concentrate volume**, **Concentrate strength**, **Calibration**,
  **Concentrates**, **Preparation**, and **Dose**.
- Preserve the Lotus tab's verbose explanation, independent-model disclosure,
  weight-first instructions, calibration guidance, and source links.
- Do not change chemistry formulas, salt grouping, hydration selection,
  concentrate safety checks, Lotus model behavior, or imported-recipe handoff
  behavior.

## Shared shell

The Concentrate workspace keeps its current two tabs:

- **Stock builder**
- **DIY Lotus Drops**

Both tabs use the same workspace header treatment:

- `FlaskConical` glyph
- **Concentrate workspace** eyebrow
- the same tab control shape and spacing
- method-specific accent colors are allowed, but component geometry and icon
  patterns remain shared

Imported recipes continue to render inside **Stock builder**. The imported
recipe name is the active plan rather than a separate third tab.

## Shared card hierarchy

The content order should communicate the same mental model in each view:

1. **Plan** — what is being prepared and which method or recipe is active.
2. **Concentrate volume** — the editable prepared-liquid volume.
3. **Strength / calibration** — controls specific to the selected method.
4. **Concentrates** — the resulting bottle or dropper cards.
5. **Preparation** — how to weigh, mix, label, or calibrate.
6. **Dose** — how to use the finished concentrate.

Not every workflow needs every card as a separate section. Existing Lotus
content may combine preparation and calibration where that keeps its detailed
instructions readable.

## Vocabulary mapping

### Stock Builder and imported recipes

- `Style` becomes **Plan** where the section controls the concentrate strategy.
- `Make one mineral stock` becomes **Build one concentrate**.
- `Single mineral` becomes **Clear imported recipe**.
- `Stock strength` becomes **Concentrate strength** when referring to the
  prepared liquid.
- `Stock plans` and generated stock headings become **Concentrates**.
- Existing strategy names remain **GH + KH**, **All-in-one**, and
  **Separate salts**.

### DIY Lotus Drops

- `Bottle volume` becomes **Concentrate volume**.
- `Stock volume` becomes **Concentrate volume** when shown to users.
- `Stock strength` becomes **Concentrate strength** where the value describes
  the finished liquid.
- `Dropper style` stays unchanged because it is a real Lotus-specific choice.
- Keep **DIY Lotus Drops** as the tab and product-specific workflow name.
- Keep the detailed Lotus copy, including the independent-model notice and
  weight-first explanation.

### Shared nouns

- **Salt** means the dry ingredient being weighed.
- **Concentrate** means the prepared liquid.
- **Concentrate volume** means the prepared-liquid or bottle-volume reference.
- **Dose** means the amount added to final brew water.
- **Calibration** means measured dropper behavior used for dosing.

## Shared dropper reference

Add a compact **Dropper reference** card to Stock Builder, including imported
recipe handoffs. It uses the same `Droplet` glyph and field-card treatment as
the Lotus tab.

The reference contains:

- a **Round / Straight** selector;
- the default Straight reference of `20.0 drops/mL`;
- the default Round reference of `11.2 drops/mL`, derived from the existing
  `0.56` Round style factor;
- the active style and its drops/mL value in the dose summary.

This reference is informational in Stock Builder. The existing calibrated app
dose remains authoritative and the new selector must not silently replace or
mutate the current chemistry or dosing state. DIY Lotus remains the workflow
where the Straight drops/mL baseline is editable and drives its model.

The displayed values should use the existing Lotus measurement helper/constants
so the two tabs cannot drift numerically.

## Component boundaries and data flow

- Keep `ConcentrateWorkspace` responsible for tab selection and shared
  workspace framing.
- Keep `RecipeConcentrateBuilder` responsible for imported-recipe strategy,
  strength, volume, grouping, and salt-mass calculations.
- Keep `LotusDropsSection` responsible for Lotus-specific stock plans,
  editable bottle/concentrate volume, dropper style, and verbose guidance.
- Extract or reuse small presentational primitives only where that reduces
  duplicated visual grammar; do not move chemistry state into a shared
  controller.
- Pass only the display values needed for the Stock Builder dropper reference.
  Do not introduce a new persistence or server contract.

## Accessibility and responsive behavior

- Preserve existing tab, button, input, and table semantics.
- Give the Round/Straight selector an explicit accessible label and pressed
  state.
- Keep the selected measurement visible as text, not color alone.
- Maintain the existing mobile stacking behavior for control cards and
  concentrate cards.
- Preserve visible keyboard focus and reduced-motion behavior.

## Verification

- Add or update focused tests for the shared Round/Straight measurement values
  and ensure Lotus behavior remains unchanged.
- Run the full concentrate-related test suite.
- Run typecheck, production build, and diff checks.
- Restart the Coffee Water Calculator workflow after implementation.
- Verify the preview at desktop and mobile widths.
- Check browser console output for new errors.

## Out of scope

- Merging Stock Builder and Lotus calculations.
- Changing Lotus recipe inputs, product names, source disclosures, or verbose
  preparation language.
- Making Stock Builder's dropper reference editable or persistent.
- Changing the existing calibrated Brewer dose or concentrate math.
- Redesigning unrelated Brewer, Alchemist, or Watermancer surfaces.