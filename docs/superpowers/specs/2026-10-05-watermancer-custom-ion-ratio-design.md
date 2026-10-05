# Watermancer Standalone Custom Ion Ratio

## Goal

Let users compare any two core Watermancer ions in the live ratio preview by independently cycling the left and right ion labels. This is a read-only comparison and is separate from the existing fixed ratios and combined/pairwise display.

## Design

Add a standalone custom ion-ratio item beside the existing ratios in both compact and classic Watermancer readings. Keep it visible regardless of whether the existing relationship display is in combined or pairwise mode. Do not replace, edit, or couple it to GH:KH, Mg:Ca, Cl:SO₄, K:Mg, Na:Ca, or the existing combined relationship.

Start with **Na:K**. Show each ion formula using its existing ion color, and show the left ion divided by the right ion as a ratio to one, for example `Na:K 1.5:1`. Use one decimal place. If the right-side concentration is zero, show `—` rather than an undefined or infinite ratio.

Each side is a separate keyboard-accessible button. Clicking a side advances only that ion through this fixed cycle:

`Na → Cl → Mg → K → Ca → SO₄ → HCO₃ → citrate → Na`

Keep the selected pair distinct: when advancing would select the ion already shown on the other side, advance to the next ion instead. The two controls retain left/right orientation; selecting a different ion on one side never swaps the pair or changes the other side.

The comparison uses the same live ion values as the existing Watermancer ratios: modeled final-mixture ions when a mixture is available, otherwise the selected target preview. The selection is a temporary display preference, defaults to Na:K on a fresh Watermancer view, and does not update target values, saved profiles, recipe ratios, or solver inputs.

## Data flow and boundaries

1. Pass the current ratio ion values and selected left/right ion IDs into the standalone ratio display.
2. Derive `left_ppm / right_ppm` for presentation only; do not feed the result into water matching, recipe editing, saved profiles, or charge-balance behavior.
3. Keep cycling order and distinct-pair handling in small deterministic helpers so both behaviors can be unit-tested.
4. Render the standalone comparison outside the existing combined/pairwise relationship toggle so it remains independently visible.

## Accessibility and responsive behavior

- Each ion formula is a distinct button with an accessible name indicating which side it changes and the ion it currently selects.
- Preserve visible keyboard focus and a clear pressed/hover state without obscuring the ion-specific color.
- Keep the ratio readable and usable in the narrow compact rail and in the classic readings layout.

## Verification

- Test the default Na:K pair and the full cycling order, including wraparound.
- Test that cycling one side leaves the other unchanged and skips it to prevent identical ions.
- Test left/right orientation, one-decimal ratio formatting, a zero numerator, and a zero right-side denominator.
- Verify both compact and classic displays show the independent ratio in combined and pairwise modes.
- Verify changing the pair does not modify Watermancer targets, saved profiles, existing ratios, or solver inputs.
- Run relevant calculator tests, type checking, and a production build.