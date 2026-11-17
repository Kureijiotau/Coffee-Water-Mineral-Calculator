# Watermancer Guided Dropper Calibration Wizard

## Goal

Add an optional, step-by-step calibration wizard to the Watermancer Guide so users can measure a straight or round dropper tip consistently and save that calibration through the existing shared calibration path.

## Existing behavior and boundaries

- Keep the existing straight- and round-tip calibration cards, including their drops and water-weight inputs and **Use** buttons.
- Keep calibration storage and consumers unchanged. Saving from the wizard must use `withDiyLotusCalibration` and `saveDiyConcentrateInputs`, with the summed drops and summed water weight stored in the existing `dropsInput` and `weightInput` fields for the selected style.
- Continue sharing Watermancer Guide calibration with DIY Stock Builder and DIY Lotus Drops only. Recipe Concentrate and Alchemist calibrations remain independent.
- Do not change chemistry, solver behavior, or storage schema.
- Reuse existing guide photos; add no image files.

## Entry point and dialog

On the Watermancer Guide's **Calibrate** step, add a **Guided calibration** button alongside the existing calibration cards. It opens a five-page dialog styled like the “How it works: salt targets, GH, and KH” guide: the existing color language, one instruction per page, a shared fixed dialog height, and a pinned footer with **Close**, **Back**, and **Next** controls. The body must be constrained so the footer stays visible on phones and the pages do not create inner scrolling on desktop.

The wizard opens on the tip-selection page. Preselect a style that already has a valid saved calibration; if neither style has one, preselect **Straight**. If both styles are calibrated, preselect **Straight**.

## Wizard pages

1. **Choose a tip.** Present selectable **Straight** and **Round** cards using the existing tip photos and their existing alt text. The user can change the preselected style.
2. **Set up.** Instruct the user to place a cup or pan on the scale, tare it, and hold the dropper vertically. Reuse the existing guidance that tilting the dropper 45 degrees can change drop weight by up to 15–20%.
3. **Run 1.** Ask the user to dispense plain water and enter the drop count and resulting weight in grams. Default drops to `50`; allow editing. Show: “Using a 0.1 g scale? Use 100 drops.” The user cannot advance until both fields are finite positive numbers.
4. **Runs 2 and 3.** Provide the same editable drops and weight fields for each run, plus a live result summary. Both runs are optional and can be skipped. An optional run contributes only when both its values are finite and positive; blank, zero, negative, or incomplete runs are ignored.
5. **Result.** Show the combined drops per mL, grams per drop, and run-to-run spread. Use the water estimate `1 mL = 1 g`. Calculate the combined rate from total valid drops divided by total valid grams. Calculate spread from the valid per-run drops-per-mL rates as `(maximum - minimum) / mean × 100`. With fewer than two valid runs, display **—** for spread. When spread is greater than 5%, show a warning recommending that the user repeat the measurement while holding the dropper vertically. Provide **Save** and **Start over** actions.

For pages 3 and 4, show a small thumbnail of the selected tip photo next to the fields. For page 5, show the existing dropper-lineup photo as a wide banner.

## Photo and layout requirements

- Page 1: straight-tip and round-tip photos, with their existing alt text.
- Page 2: scale photo with alt text **“Milligram scale with a weighing pan.”**
- Pages 3 and 4: thumbnail of the selected tip photo.
- Page 5: dropper-lineup photo with alt text **“Labelled dropper bottles, one salt per bottle.”**
- Every tip photo must be accompanied by the caption **“Tip shape only. Hold the dropper vertical when dispensing.”** Do not use a tip photo to illustrate dispensing posture.
- Do not lazy-load page 1 photos. Lazy-load every other wizard photo.
- Constrain image dimensions and use object-fit so the dialog body does not scroll at desktop size and the pinned footer remains usable at 375 × 812.

## Calculation module

Put the arithmetic and input validation in a plain TypeScript module with no React dependencies. It must combine valid runs and return combined drops, combined grams, drops per mL, grams per drop, spread, and validity/result state. Keep the component responsible for form state, page navigation, and presentation.

Unit coverage must include:

- One valid run.
- Three valid runs.
- A zero or blank run being ignored.
- Spread exactly at 5% and just above 5%.
- 50 drops at 2.00 g producing 25 drops per mL and 0.04 g per drop.

## Saving and visible state

Saving uses the existing persistence path for the selected style and stores the sums of valid runs as strings in the existing calibration fields. After saving, the existing cards must display the newly saved values without requiring a page reload. Saving must not alter the other tip's calibration or any unrelated settings.

**Start over** returns to the tip-selection page, clears the entered measurement runs, restores the first-run default of 50 drops, and applies the current saved-style preselection rule.

## Verification

Add browser coverage for:

- Completing three runs, saving, and seeing the saved values on the existing calibration card.
- Saving after skipping runs 2 and 3.
- Showing the warning when spread exceeds 5%.
- Every page displaying its required photo with non-empty alt text, and the exact tip-photo caption wherever a tip photo appears.
- At 375 × 812, **Next** remaining in the viewport on every page without scrolling.
- At 1280 × 800, no wizard page body scrolling and the **Next** button in the same position on every page.

Run the new calculation tests, the existing Guide and calibration tests, the full unit suite, and the TypeScript check. Do not push.
