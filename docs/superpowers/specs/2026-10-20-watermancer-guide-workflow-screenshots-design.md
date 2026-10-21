# Watermancer Guide Step 7: Text-First Live Screenshots

**Date:** 2026-10-21
**Status:** Awaiting user review of revised design

## Goal

Keep Step 7’s five grouped workflow scenes, but make the instructions the main content and the screenshots compact, visible previews. Remove the incorrect Kimoi example and use the owner-provided, verified one-liter recipe throughout the recipe-selection and finished-card examples.

## Guide recipe data

Name the sample **Guide recipe**. Preserve the provided quantities exactly:

- Final batch: 1 L
- RO / distilled water: 966 mL
- Evian: 34 mL
- Magnesium sulfate heptahydrate (MgSO₄·7H₂O): 14 mg
- Magnesium chloride hexahydrate (MgCl₂·6H₂O): 20 mg
- Sodium chloride (NaCl): 4 mg
- Potassium chloride (KCl): 2 mg

Use the existing shared Evian profile for the 34 mL contribution: Na 6.5, Ca 80, SO₄ 14, Mg 26, K 1, and HCO₃ 360 mg/L. Let the live Watermancer calculation produce the final readings; do not hand-author a target/result or substitute another recipe. Do not change or remove Kimoi from the actual catalog—this exclusion applies to Step 7 only.

## Approved direction

Use authentic screenshots captured from the running Watermancer UI, not hand-built mockups. Retake and visually audit all Step 7 captures so none shows Kimoi; keep the selected profile and final recipe card consistently named **Guide recipe**.

Prioritize instructional text:

- Increase scene headings and instructions to clear, high-contrast body text; present the action and explanation before its screenshot.
- Keep every screenshot visible as a small preview, with a maximum width around 360 px. Do not hide previews behind accordions or “show screenshot” controls.
- On wider screens, place the text beside its preview. On narrow screens, stack the text first and the preview below it.
- Clicking a preview opens the original screenshot at a larger, viewport-fitted size in the app’s existing accessible dialog.
- Color ion names and formulas with the existing `ION_MAP` colors. Keep other text in the established Watermancer palette.

## Walkthrough sequence

1. **Choose and manage a recipe**
   - Show **Guide recipe** selected.
   - Explain creating, editing, downloading, importing, and resetting; describe reset’s actual scope.
2. **Set the plan**
   - Show ion targets and the final 1 L batch volume.
3. **Add waters**
   - Explain adding a new water source, finding and adding a Community water, and sharing a personal water.
4. **Choose salts and match**
   - Show the selected salts and hydration forms from the Guide recipe.
   - Explain how source choices and enabled salts affect matching; show the real controls and accurately label the result.
5. **Review and save**
   - Show the live-generated Guide recipe card with the exact water and salt quantities and calculated final readings.
   - Explain saving the card.

Keep the established Watermancer control names and action meanings. The guide explains the interface; screenshot previews do not execute app actions.

## Interaction and accessibility

- Make each preview a keyboard-operable button with a descriptive accessible name and image alt text.
- The larger-image dialog must have an accessible title, a visible close control, Escape-key dismissal, focus management, and a contained image that fits the viewport.
- Retain a usable text-first layout at mobile widths without horizontal overflow.

## Scope

- Update Step 7 wording, screenshot presentation, dialog behavior, and the screenshot assets.
- Keep the five workflow groups and all previously requested actions.
- Do not change recipe storage, matching logic, the shared water catalog, salt behavior, exports, recipe-card generation, or the other guide steps.

## Acceptance criteria

- Step 7 shows no Kimoi reference in its text or screenshot assets, and its example uses the exact Guide recipe quantities above.
- Screenshots are real captures of the running app; the profile and final card are consistent and use the name **Guide recipe**.
- Instructions are more prominent than the screenshots; all screenshots remain visible as compact previews and open full-size when activated.
- Ion references use their existing colors without introducing a new palette.
- The five workflow scenes still explain recipe actions, targets, batch volume, new and Community waters, sharing, salts, matching, and saving the finished card.
- Automated tests cover the recipe copy, screenshot assets, preview buttons, and dialog behavior. Manually inspect the screenshot assets and verify desktop/mobile layout.
- The full web-app test suite, typecheck, and production build pass.
