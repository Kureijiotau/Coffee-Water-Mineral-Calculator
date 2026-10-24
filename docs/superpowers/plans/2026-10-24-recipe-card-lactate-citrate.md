# Recipe Card Lactate and Citrate Implementation Plan

> **For agentic workers:** Use the executing-plans skill to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Show recipe-derived Lactate and nonzero Citrates in the main recipe card's mineral analysis and downloaded share image.

**Architecture:** `App.tsx` will calculate supplemental readings from the card's existing `stepSaltTargets`, then pass Lactate to both the on-screen `MineralAnalysisLabel` and the share-card model. `waterRecipeImage.ts` will render a dedicated supplemental-ion category. The Water Tasting profile-analysis call site and chemistry calculations remain unchanged.

**Tech Stack:** React, TypeScript, Vitest, SVG share-card renderer.

**Spec:** `docs/superpowers/specs/2026-10-24-recipe-card-lactate-citrate-design.md`

## Global Constraints

- Keep Water Tasting profile analysis unchanged.
- Do not change recipe storage/import payloads or chemistry calculations, including TDS, GH, and KH.
- Show Lactate only when its computed contribution is greater than `0.05 mg/L`.
- Keep Citrates in “Other modeled ions” and show them only when their reading is greater than `0.05 mg/L`.

## Review Focus

- A positive Calcium Lactate dose produces a visible Lactate row using the existing supplemental-ion calculation.
- Zero or non-finite Lactate does not produce a recipe-card row.
- Positive Citrates remain visible and zero Citrates remain hidden.
- The downloaded SVG includes the same Lactate and Citrates shown by the live recipe card.
- Water Tasting does not receive recipe-specific Lactate data.

---

### Task 1: Add conditional Lactate to the recipe card

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/App.tsx`
- Modify: `artifacts/coffee-water-calculator/src/waterRecipeImage.ts`
- Test: `artifacts/coffee-water-calculator/src/waterRecipeImage.test.ts`

**Interfaces:**
- Consumes: `computeSupplementalIonTotals(stepSaltTargets)` and `SUPPLEMENTAL_ION_MAP.lactate` from the existing water-data module.
- Produces: A conditional `Lactate` row in the on-screen recipe analysis and the share-card model, categorized as `Supplemental ions`.

- [x] **Step 1: Write a failing share-card renderer test**

  In `waterRecipeImage.test.ts`, build an SVG with a nonzero Citrates row and a nonzero Lactate row. Assert both names and their `mg/L` values render, and that Lactate is under the `SUPPLEMENTAL IONS` heading. Also verify an analysis without these rows does not render either name.

- [x] **Step 2: Run the focused test and confirm it fails**

  Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/waterRecipeImage.test.ts`

  Expected: The test fails because the renderer does not yet support the `Supplemental ions` category.

- [x] **Step 3: Implement the display path**

  Extend the share-card ion category and SVG renderer for `Supplemental ions`. In `App.tsx`, derive Lactate from the existing `stepSaltTargets`, apply the `> 0.05 mg/L` visibility threshold, and pass the visible reading to the recipe card's on-screen analysis and share-card model. Keep the Water Tasting analysis call unchanged.

- [x] **Step 4: Run focused and full verification**

  Run the focused image test, then `pnpm --filter @workspace/coffee-water-calculator run test`, `pnpm --filter @workspace/coffee-water-calculator run typecheck`, and `pnpm --filter @workspace/coffee-water-calculator run build`.

- [x] **Step 5: Commit the verified implementation locally**

  Do not push the commit.
