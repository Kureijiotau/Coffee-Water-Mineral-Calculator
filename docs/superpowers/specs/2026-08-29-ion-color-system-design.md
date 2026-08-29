# Unified Ion Color System

**Date:** 2026-08-29

## Goal

Make mineral readings easier to scan by giving every modeled ion a stable visual identity. The same ion must look the same wherever it appears in the Coffee Water Calculator, while target status must remain independently understandable.

## Scope

This change covers:

- The water-mineral base/addition water reading rows.
- The Watermancer current-ion readings card and its compact feedback rows.
- Watermancer profile cards and comparison tables.
- Other existing ion summaries that currently use hard-coded or generic ion colors.
- Core ions and the additional modeled ion types already present in the shared ion metadata.

This does not change:

- Chemistry calculations, solver inputs, targets, thresholds, or persistence.
- Supplemental carrier-ion treatment for lactate or glycinate.
- The meaning of green/covered, under-target, or overshoot states.

## Design

### 1. Central palette

Extend the existing shared ion metadata with presentation tokens for each modeled ion. Each ion has:

- A readable foreground color for formula labels and values.
- A softer surface/border color for row accents and chips.
- A bar color for the ion’s contribution/coverage fill.

The palette uses deliberately separated hues on the calculator’s dark navy surface:

| Ion | Formula | Hue |
| --- | --- | --- |
| Sodium | Na⁺ | amber |
| Potassium | K⁺ | violet |
| Magnesium | Mg²⁺ | cyan |
| Calcium | Ca²⁺ | sky blue |
| Chloride | Cl⁻ | blue |
| Sulfate | SO₄²⁻ | orange |
| Bicarbonate | HCO₃⁻ | teal |
| Carbonate | CO₃²⁻ | lime |
| Citrates | C₆H₅O₇³⁻ | pink |
| Bicitrates | C₆H₆O₇²⁻ | fuchsia |
| Biphosphates | H₂PO₄⁻ | indigo |
| Phosphates | PO₄³⁻ | rose |

The exact shade values should be tuned against the existing dark theme and checked for readable contrast. The mapping must be keyed by `IonId`, not by display text.

### 2. Formula-first labels

Reading rows should lead with the compact chemical formula, including charge where available. The full ion name remains available through:

- A visible secondary label where the layout has room.
- The `title`/accessible label for compact layouts.

Examples: `Na⁺`, `K⁺`, `Mg²⁺`, `Ca²⁺`, `Cl⁻`, `SO₄²⁻`, `HCO₃⁻`.

Formula rendering should use the existing formula metadata rather than duplicating abbreviations in individual components. Comparison tables and summaries should consume the same source.

### 3. Layered visual encoding

Ion identity uses the shared ion color for:

- Formula text or formula chip.
- Left edge/row accent.
- Reading value.
- Ion contribution or coverage bar fill.

Target state remains separate:

- Status text continues to say whether the ion is under target, covered, or above target.
- Status markers/borders retain their semantic state treatment.
- Hover/focus range comparison markers retain their existing green/rose meaning.

If the identity color and a status color compete in the same element, identity wins for the primary ion content and status is represented by a separate marker, border, or text treatment.

### 4. Shared rendering path

Create a small shared presentation helper or component contract that converts an `IonId` into:

- Formula and full name.
- CSS variable/class values for foreground, soft surface, border, and bar.

Rows should set the ion tokens at their root and let child elements consume them. This keeps compact feedback rows, full-size readings, and profile summaries visually synchronized without duplicating color decisions.

Supplemental ions remain visually distinct as supplemental components and are not assigned core-ion colors.

## Interaction and accessibility

- Color is never the only status signal; all status states retain text and/or shape/marker cues.
- Formula labels remain readable at mobile widths and do not rely on hover.
- Keyboard focus styles remain visible against each ion’s tinted row accent.
- The shared color mapping is static, so values changing during water adjustments do not cause identity colors to shift.
- Reduced-motion behavior remains unchanged.

## Verification

1. Add focused unit coverage for the complete ion palette mapping and formula lookup.
2. Run the existing test suite and production build.
3. Restart the calculator workflow and inspect browser logs.
4. Visually verify:
   - Water mineral readings show distinct formula colors.
   - Full-size and compact Watermancer rows match.
   - Profile/comparison summaries use the same ion identities.
   - Status meaning is still clear when an ion is under, covered, or over target.
   - Mobile layout does not clip formulas or values.
