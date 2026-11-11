# PeakKitchen Recipes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Club Soda, Jelly, Lily, and Conflate to a shared PeakKitchen built-in recipe group, preserving their pictured hydrated-salt doses and Conflate silica instruction.

**Architecture:** Keep PeakKitchen catalog data in a focused module that exports standard `SaltRecipe` entries, the picker group, and a recipe-ID-to-silica-target helper. Integrate that catalog into the existing shared recipe list and both grouped picker builders; let the existing Watermancer silica target convert 250 ppm to the correct whole-drop count for the current batch.

**Tech Stack:** React, TypeScript, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-11-peak-kitchen-recipes-design.md`

## Global Constraints

- Treat each pictured hydrated-salt mass as the physical dose for 1 L of finished water.
- Convert hydrated physical mass to the app's anhydrous-equivalent mg/L using `physical mass × anhydrous molar mass ÷ selected hydrate molar mass`.
- Preserve the pictured hydration forms and recipe names: Club Soda, Jelly, Lily, and Conflate.
- Represent Conflate silica as 250 ppm (20 drops per liter at 12.5 mg per drop), outside modeled salt-ion targets.
- Selecting Conflate in Watermancer sets its silica target to 250 ppm; the existing Watermancer control scales drops with batch volume.
- Do not change the chemistry solver, unrelated recipe groups, or stock-preparation workflows.

## Review Focus

- **Hydrated physical doses must round-trip exactly at 1 L.** Pin each recipe's saved target/form pair to the pictured salt mass by running `computeSaltMg` at 1 L.
- **Target conversion must scale to other brew volumes.** Verify Conflate's 250 ppm produces 10 drops at 0.5 L and 20 at 1 L through `watermancerSilicaDropsForTarget`.
- **Unrelated recipe choices must not inherit Conflate silica.** Test that only Conflate maps to the 250 ppm silica target; other PeakKitchen recipes have no silica target.
- **Recipe names and group options must remain stable.** Assert the exact four names and IDs in the PeakKitchen picker group.
- **Recipe selection must preserve the user's existing controls outside its scope.** Verify a non-Conflate selection does not clear or alter an existing manual silica value.

---

### Task 1: Add PeakKitchen recipe catalog and selection behavior

**Files:**
- Create: `artifacts/coffee-water-calculator/src/peakKitchenRecipes.ts`
- Create: `artifacts/coffee-water-calculator/src/peakKitchenRecipes.test.ts`
- Create: `artifacts/coffee-water-calculator/e2e/peak-kitchen-recipes.spec.ts`
- Modify: `artifacts/coffee-water-calculator/src/App.tsx`
- Read: `artifacts/coffee-water-calculator/src/waterData.ts`
- Read: `artifacts/coffee-water-calculator/src/watermancerSilica.ts`

**Interfaces:**
- Consumes: `SaltRecipe`, `computeSaltMg`, and `watermancerSilicaDropsForTarget`.
- Produces: `PEAK_KITCHEN_SALT_RECIPES: SaltRecipe[]`, `PEAK_KITCHEN_RECIPE_PICKER_GROUP` with label `PeakKitchen`, and `getPeakKitchenSilicaTargetPpm(recipeId: string): number | undefined`.

- [ ] **Step 1: Write failing catalog tests** for exact IDs/names, selected salt IDs and form indices, picker group options, and silica mapping. For each pictured hydrated salt, assert `computeSaltMg(Number(entry.target), 1, selectedForm.molarMass, salt.anhydrousMass)` reproduces its physical mass; use the displayed anhydrous-equivalent values as a rounded reference, not as a substitute for the precise round-trip target.
- [ ] **Step 2: Run the catalog tests and confirm the expected failures.** Run `pnpm --filter @workspace/coffee-water-calculator test -- src/peakKitchenRecipes.test.ts`. The initial failures should be missing catalog exports or recipe data, not test setup errors.
- [ ] **Step 3: Add the focused catalog module.** Define stable IDs `peak-kitchen-club-soda`, `peak-kitchen-jelly`, `peak-kitchen-lily`, and `peak-kitchen-conflate`. Preserve physical doses from the cards: Club Soda 3,300 mg MgCl₂·6H₂O, 770 mg CaCl₂·2H₂O, 440 mg NaCl, 150 mg NaHCO₃, 110 mg KHCO₃; Jelly 1,750 mg MgCl₂·6H₂O, 890 mg CaCl₂·2H₂O, 560 mg KCl, 250 mg KHCO₃, 230 mg NaHCO₃; Lily 2,200 mg MgSO₄·7H₂O, 1,300 mg MgCl₂·6H₂O, 630 mg KCl, 300 mg KHCO₃, 250 mg NaHCO₃, 100 mg NaCl; Conflate 1,050 mg CaCl₂·2H₂O, 700 mg KCl, 600 mg NaCl, 200 mg KHCO₃, 150 mg NaHCO₃, plus 20 silica drops per liter. Store the salt target with sufficient precision for the selected hydration form to reproduce the exact physical dose.
- [ ] **Step 4: Integrate the PeakKitchen group into shared recipe selection.** Include its recipes in the existing built-in salt-recipe list and add its group to the Brewer/Alchemist recipe picker and the Watermancer built-in target picker. Keep all existing groups and selection semantics unchanged.
- [ ] **Step 5: Add separate silica guidance and Watermancer target behavior.** Show Conflate silica as a preparation item outside the salt list. When Conflate is selected as the Watermancer target, enable a 250 ppm silica target and derive the drop count using the current batch volume. Do not alter silica state when another PeakKitchen recipe without silica is selected.
- [ ] **Step 6: Add browser coverage for picker selection.** In `peak-kitchen-recipes.spec.ts`, verify the PeakKitchen subsection lists all four recipes, selecting each loads the expected name and salt amounts, and selecting Conflate in Watermancer sets 250 ppm and displays 20 drops for a 1 L batch (10 drops for 0.5 L).
- [ ] **Step 7: Run focused, full, and build checks.** Run `pnpm --filter @workspace/coffee-water-calculator test -- src/peakKitchenRecipes.test.ts`, `pnpm --filter @workspace/coffee-water-calculator typecheck`, `pnpm --filter @workspace/coffee-water-calculator test`, the focused Playwright test, and `pnpm --filter @workspace/coffee-water-calculator build`.
- [ ] **Step 8: Commit the tested implementation.**
