# Water Tasting Cup Shape and Descriptor Design

## Goal

Extend Water Tasting so a user can record the direction water pushed a brewed cup without writing paragraphs. Keep the current 0–10 water-contribution ratings as a separate score, add four bipolar cup-shape readings, and make the cup-effect descriptors easier to scan.

## Current behavior and constraints

- Water Tasting stores personal notes in browser local storage.
- Five optional 0–10 ratings produce the existing 0–50 total. Their values, weighting, prompts, and scoring behavior must not change.
- Descriptors are saved by stable string IDs and currently appear in the “Water character” and “Cup effect” groups.
- Saved tasting records can be reopened and edited, and older records must remain readable.

## Approaches

1. **Eleven-position bipolar sliders (selected).** Use integer values from −5 to +5 with 0 at the center. This records direction and degree while keeping neutral distinct and visible.
2. **Three-position controls.** Offer only the left endpoint, neutral, and right endpoint. This is quicker, but loses the degree of the effect.
3. **Descriptor-only profiling.** Add the new words without sliders. This minimizes UI, but does not capture the directional spectrum requested.

The selected approach preserves the existing rating model and adds a separate, subjective profile. Slider values are never inferred from magnesium, calcium, or other chemistry.

## Cup-shape interaction

Add a “Cup shape” section after “Water contribution” and before the descriptor groups. It contains four native range controls, each with `min=-5`, `max=5`, `step=1`, and a visible numeric value:

| Dimension | Left endpoint (−5) | Center (0) | Right endpoint (+5) |
|---|---|---|---|
| Acidity focus | Sharp / Articulate | Neutral | Mellow / Rounded |
| Body / weight | Tea-like / Weightless | Neutral | Heavy / Coating |
| Structure | Isolated / Monotone | Neutral | Complex / Layered |
| Finish | Fast / Fleeting | Neutral | Lingering / Long |

New tastings initialize all four controls to 0. In this scale, 0 means the user is recording a neutral/balanced observation; it is not an unset value. Use native slider keyboard behavior and accessible names that identify the dimension and endpoints. Keep the control labels, endpoint text, and current value visible without relying on color alone.

The 0–10 rating section remains unchanged and continues to represent the user's personal water-contribution impression. The new spectrum does not change the total or any chemistry calculations.

## Descriptor organization

Keep “Water character” and its existing options unchanged. Replace the single “Cup effect” group with three collapsible, horizontally arranged chip groups:

- **Acidity/Sweetness:** Crisp, Rounded, Sparkling, Tart, Jammy
- **Body/Tactile:** Thin, Full / coating, Drying, Hollow, Juicy, Syrupy
- **Finish/Defects:** Muted, Short finish, Lingering finish, Tannic / astringent, Muddy, Flat, Clean finish

Retain every existing descriptor ID, even when moving a descriptor to another group, so saved selections continue to resolve. Add stable IDs for new descriptors: `sparkling`, `tart`, `jammy`, `hollow`, `juicy`, `syrupy`, `tannic-astringent`, `muddy`, `flat`, and `clean-finish`. “Clean finish” is distinct from the existing “Clean / neutral” water-character descriptor.

## Saved records and history

Add four spectrum dimensions: `acidityFocus`, `bodyWeight`, `structure`, and `finish`. New drafts and new saved records contain all four integer values, defaulting to 0.

Keep `spectrum` optional on stored records for backward compatibility. A legacy record without it remains valid and is shown in history as “Cup shape not captured.” When a user opens and saves such a record, its edit form uses the normal 0 defaults and saves the complete spectrum; loading alone must not rewrite storage. When creating or updating records, copy the spectrum object so form state and saved state do not share a mutable reference.

Show a compact, labeled four-value summary on new history cards, using signed values for nonzero readings. Keep the existing score total, profile snapshot, coffee details, descriptors, edit, and delete behavior intact.

The existing `cwm.waterTastings.v1` key can remain because the optional field is backward-compatible. The loader must accept records with no `spectrum`, and validate any present spectrum as exactly the four known dimensions with integer values in the inclusive range −5…+5. Unknown dimensions, fractional values, and out-of-range values make a record invalid, consistent with current record validation.

## Non-goals

- Do not change the existing 0–10 score, prompts, or total.
- Do not convert slider readings into mineral targets, chemistry calculations, or profile guidance.
- Do not replace the existing Water Tasting visual system or the profile mineral-analysis card.
- Do not add text-entry requirements; all new profile inputs remain quick controls.

## Verification

- Unit-test neutral defaults, valid negative/zero/positive values, invalid spectrum values, create/update copies, and storage round-trips.
- Confirm legacy records without a spectrum still load and remain unchanged until explicitly saved.
- Confirm old descriptor IDs still validate after regrouping and each new descriptor ID is accepted.
- Verify the four controls are keyboard-operable, display the selected values, and retain them through save, edit, reload, and history rendering.
- Verify descriptor chips appear in the requested groups and remain toggleable.
- Run the calculator typecheck, unit suite, production build, and focused Water Tasting browser coverage.