# Robert Asami Recipe Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all seven default Robert Asami Week 1 recipes to Brewer, Alchemist, and Watermancer built-in catalogs, and make the Guide’s recipe action hand off to Brewer with the selected recipe applied.

**Architecture:** Move the canonical seven-day recipe data into a lightweight shared module and derive `SaltRecipe` records from it. Reuse those records for the salt recipe selectors and calculate Watermancer ion targets through the existing chemistry engine on the guide’s zero-TDS basis. Keep the Guide-only Day 5 swaps out of built-in catalogs.

**Tech Stack:** React, TypeScript, Vitest, Playwright, existing Watermancer chemistry engine.

**Spec:** `docs/superpowers/specs/2026-11-01-robert-asami-recipe-catalog-design.md`

## Global Constraints

- The built-in catalog contains only the seven default/published day recipes; optional Day 5 swaps remain Guide-only.
- Brewer, Alchemist, Watermancer, and the Guide derive from one canonical Week 1 recipe data set.
- Watermancer ion targets use existing engine calculations with zero-TDS source water; do not estimate or manually round them.
- The Guide handoff enters Brewer mode before applying recipe state, so the mode-entry reset cannot clear the selected recipe.
- Do not change existing built-ins, saved recipes, or unrelated recipe-source catalogs.

## Review Focus

- Day 5’s catalog entry must use its published salts, while either optional swap remains usable from the Guide; test both behaviors in Task 1 and Task 3.
- Hydrated salts must preserve the guide’s selected hydration forms and omit unused salts; cover all seven records in Task 1.
- Derived Watermancer targets must include each modeled counterion from the salt recipe, including Day 1 and Day 6; assert exact engine output in Task 1.
- A Guide handoff from a non-Brewer mode must end in Brewer with recipe targets intact after initialization; verify in Task 3.
- Existing built-in and saved recipe selection must remain unchanged; include a regression check in Task 2.

---

### Task 1: Extract shared Week 1 recipe data

**Files:**
- Create: `artifacts/coffee-water-calculator/src/week1GuideRecipes.ts`
- Modify: `artifacts/coffee-water-calculator/src/Week1Guide.tsx`
- Modify: `artifacts/coffee-water-calculator/src/Week1Guide.test.ts`
- Create: `artifacts/coffee-water-calculator/src/week1GuideRecipes.test.ts`

**Interfaces:**
- Produces `Week1Recipe`, `Week1Day`, `DAYS`, `equivalentSaltTarget`, and `ROBERT_ASAMI_WEEK1_SALT_RECIPES` from `week1GuideRecipes.ts`.
- `ROBERT_ASAMI_WEEK1_SALT_RECIPES` is a `SaltRecipe[]`; entries use stable IDs `robert-asami-week1-day-1` through `robert-asami-week1-day-7`, source day names, physical targets, and the exact `formIdx` from the guide.
- `Week1Guide.tsx` imports the shared data and re-exports the existing `DAYS`, `Week1Recipe`, and `equivalentSaltTarget` API for current consumers.

- [ ] **Step 1: Write failing shared-data tests**

  In `week1GuideRecipes.test.ts`, assert there are seven converted recipes, their stable IDs and names match `DAYS`, and each recipe has the same positive salt IDs, normalized targets, and hydration forms as its source day. Assert Day 5 has only `mgso4`, `cacl2`, and `khco3` (not the optional swap salts). Derive ion totals with `computeIonTotals` and compare the generated Day 1 and Day 6 readings to the source day targets.

- [ ] **Step 2: Run the focused test and confirm the expected failure**

  Run: `pnpm --filter @workspace/coffee-water-calculator test -- src/week1GuideRecipes.test.ts`

  Expected: FAIL because the shared recipe module and conversion export do not exist yet.

- [ ] **Step 3: Extract the canonical data and add the salt-recipe conversion**

  Move the existing day types, source recipe data, and `equivalentSaltTarget` implementation from `Week1Guide.tsx` into `week1GuideRecipes.ts`. Generate the seven `SaltRecipe` records from `DAYS`; do not duplicate masses or forms. Update `Week1Guide.tsx` to consume the module while preserving its existing exports.

- [ ] **Step 4: Run Week 1 guide and shared-data tests**

  Run: `pnpm --filter @workspace/coffee-water-calculator test -- src/week1GuideRecipes.test.ts src/Week1Guide.test.ts`

  Expected: PASS with existing copy, physical-mass, swap, and guide-rendering tests unchanged.

- [ ] **Step 5: Commit the shared data change**

  ```bash
  git add artifacts/coffee-water-calculator/src/week1GuideRecipes.ts artifacts/coffee-water-calculator/src/Week1Guide.tsx artifacts/coffee-water-calculator/src/Week1Guide.test.ts artifacts/coffee-water-calculator/src/week1GuideRecipes.test.ts
  git commit -m "feat: share Robert Asami week one recipes"
  ```

### Task 2: Add Week 1 entries to all recipe catalogs

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/App.tsx`
- Modify: `artifacts/coffee-water-calculator/src/week1GuideRecipes.test.ts`
- Create: `artifacts/coffee-water-calculator/e2e/robert-asami-recipe-catalog.spec.ts`

**Interfaces:**
- `App.tsx` builds a combined lookup for existing `RECIPES` plus `ROBERT_ASAMI_WEEK1_SALT_RECIPES`; keep unrelated consumers of `RECIPES` unchanged.
- Brewer/Alchemist and Watermancer groups use the label **Robert Asami · Week 1**, with Day 1–Day 7 option labels and the existing `recipe:<id>` source values.
- Watermancer resolves each Week 1 option from the combined built-in recipe lookup and calculates its target ions with `ionTotalsForSaltRecipe`.

- [ ] **Step 1: Add failing catalog conversion and UI tests**

  Extend `week1GuideRecipes.test.ts` to verify every generated record produces the expected zero-TDS ion totals and retains nonzero counterions. In the new Playwright test, assert the Week 1 group and seven day options are present in Brewer, Alchemist, and Watermancer; selecting a day loads its source recipe or derived target; Day 5 swap variants do not appear; and existing Kimoi and saved recipe selection still works.

- [ ] **Step 2: Run focused tests and confirm the expected failures**

  Run: `pnpm --filter @workspace/coffee-water-calculator test -- src/week1GuideRecipes.test.ts`

  Run: `pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/robert-asami-recipe-catalog.spec.ts`

  Expected: the catalog assertions fail because the Week 1 group is not yet wired into the pickers.

- [ ] **Step 3: Wire the shared recipes into the picker groups and lookups**

  Add the **Robert Asami · Week 1** group to the existing Brewer/Alchemist recipe picker and the Watermancer built-in target-source picker. Use the combined built-in lookup anywhere these selectors resolve a built-in recipe name, salt rows, or ion targets. Do not add the new records to unrelated recipe-source collections.

- [ ] **Step 4: Run the focused catalog and browser tests**

  Run: `pnpm --filter @workspace/coffee-water-calculator test -- src/week1GuideRecipes.test.ts`

  Run: `pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/robert-asami-recipe-catalog.spec.ts`

  Expected: all seven entries work in all three modes; Day 5 remains default-only in the catalogs; existing recipes still resolve.

- [ ] **Step 5: Commit the catalog change**

  ```bash
  git add artifacts/coffee-water-calculator/src/App.tsx artifacts/coffee-water-calculator/src/week1GuideRecipes.test.ts artifacts/coffee-water-calculator/e2e/robert-asami-recipe-catalog.spec.ts
  git commit -m "feat: add Robert Asami recipes to built-in catalogs"
  ```

### Task 3: Hand off Guide recipes to Brewer

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/App.tsx`
- Modify: `artifacts/coffee-water-calculator/e2e/robert-asami-recipe-catalog.spec.ts`

**Interfaces:**
- `handleApplyWeek1Recipe(recipe: Week1Recipe)` switches the app to Calculator/Brewer, then applies the supplied active targets and forms.
- The handoff preserves the currently selected Day 5 swaps when applying from the Guide; catalog entries remain default-only.

- [ ] **Step 1: Add failing Guide-handoff browser tests**

  Extend `robert-asami-recipe-catalog.spec.ts`: select a non-default day, click **Use this recipe**, and assert the Guide closes, Calculator is selected, Brewer mode is active, and the selected salt rows/forms are present. Repeat from an Alchemist state and verify the recipe survives Brewer’s initialization. Apply Day 5 with each swap enabled and verify the handoff uses the selected variant.

- [ ] **Step 2: Run the focused browser test and confirm the handoff failure**

  Run: `pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/robert-asami-recipe-catalog.spec.ts`

  Expected: catalog tests pass, but the handoff assertions fail because the current action stays on Guide.

- [ ] **Step 3: Update the Guide action ordering**

  Update `handleApplyWeek1Recipe` to switch to Brewer mode and Calculator first, then set the selected guide override, recipe IDs, handoff token, and salt rows so Brewer’s reset cannot replace them.

- [ ] **Step 4: Run the focused browser test and full verification**

  Run: `pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/robert-asami-recipe-catalog.spec.ts`

  Run: `pnpm --filter @workspace/coffee-water-calculator test`

  Run: `pnpm --filter @workspace/coffee-water-calculator run typecheck`

  Run: `pnpm --filter @workspace/coffee-water-calculator run build`

  Expected: the handoff, catalog, complete unit-test suite, typecheck, and production build pass.

- [ ] **Step 5: Commit the Guide handoff**

  ```bash
  git add artifacts/coffee-water-calculator/src/App.tsx artifacts/coffee-water-calculator/e2e/robert-asami-recipe-catalog.spec.ts
  git commit -m "feat: open Brewer with selected guide recipe"
  ```
