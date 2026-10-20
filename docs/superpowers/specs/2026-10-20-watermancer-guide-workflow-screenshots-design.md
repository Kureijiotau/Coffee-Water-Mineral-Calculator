# Watermancer Guide Step 7: Workflow Screenshots

**Date:** 2026-10-20  
**Status:** Awaiting user review

## Goal

Replace Step 7’s five collapsible tasting-recipe examples with a visual walkthrough of the Watermancer workflow, from choosing a recipe through saving a finished recipe card. The guide should show an example for every requested feature without changing the underlying Watermancer behavior.

## Approved direction

Use a scrollable sequence of grouped workflow scenes. The examples will be static, screenshot-style UI illustrations authored in the guide, using the real Watermancer labels and visual language. They will not be interactive controls or images of user data.

The user prefers screenshots captured from the live app but approved mockups if accurate capture is difficult. The available preview screenshot tool cannot interact with the app, the Browser Use CLI is unavailable, and Playwright cannot launch because browser system dependencies are missing. Use static illustrations as the reliable fallback.

Match the existing Strength scaler illustration’s crisp, compact treatment and Watermancer’s dark slate, cyan, and ion-color palette. Keep the small UI labels legible, use short instructional captions and focused callouts, and stack examples on narrow screens. Provide accessible text descriptions for each illustrative screen. Do not add dependencies or modify the Strength scaler.

## Walkthrough sequence

1. **Choose and manage a recipe**
   - Show selecting an existing recipe.
   - Show creating a new recipe and editing one.
   - Show downloading and importing a recipe.
   - Show the reset action and accurately explain what it resets.
2. **Set the plan**
   - Show editing ion targets.
   - Show setting batch volume.
3. **Add waters**
   - Show entering a new mineral-water source.
   - Show finding and adding a Community water to the plan.
   - Show sharing a personal water with the Community.
4. **Choose salts and match**
   - Show enabling and disabling salts, including a selected hydration form and dose.
   - Explain that matching uses the chosen water sources and enabled salts to approach the selected target profile. Show the matching controls and a representative result.
5. **Review and save**
   - Show a finished recipe card with example batch volume, water sources, salt doses, and final ion readings.
   - Show how to save the card.

Use several focused screenshot panels within each scene where needed so that every requested action is visible and readable; do not compress the full workflow into one tiny collage. Mark illustrative values as examples. Use the actual app’s control names and action semantics rather than inventing new buttons or implying that the static illustrations are live controls.

## Scope and implementation shape

- Change the `make-and-taste` guide step title and summary to describe building, matching, and saving a Watermancer recipe.
- Replace the guide-only tasting-recipe accordion content with a focused workflow illustration component.
- Keep the existing guide navigation and its **Open Watermancer** action.
- Do not modify recipe storage, matching logic, community-water behavior, salt behavior, exports, or recipe-card generation.
- Retire guide-only recipe-card data and code only if they become unused after the replacement.

## Acceptance criteria

- Every requested feature has a visible illustrative example in Step 7.
- The example order follows the workflow from recipe selection to saved result.
- Community-water use and sharing are both shown.
- Salt selection and the matching process are explained without claiming the illustrations execute real actions.
- The result card includes representative final readings and a save action.
- The old five tasting-recipe accordion examples no longer appear in Step 7.
- Panels remain readable on desktop and mobile and expose accessible descriptions.
- Tests verify the Step 7 title, workflow sections, requested actions, and absence of the old recipe list. The full web-app tests, typecheck, and build pass.
