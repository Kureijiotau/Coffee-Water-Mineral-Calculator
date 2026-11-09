# Lotus Recipe Dosing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `.agents/skills/subagent-driven-development` (recommended) or `.agents/skills/executing-plans` to implement this plan task-by-task.

**Goal:** Show calibrated whole-drop amounts for Lotus’s published recipes using Watermancer’s modeled DIY stocks.

**Architecture:** Add a pure dose-planning helper beside the existing Lotus chemistry functions. Extend the existing Lotus preparation panel with a collapsed recipe calculator that reuses its brew-volume and tip-calibration state.

**Tech Stack:** TypeScript, React, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-lotus-recipe-dosing-design.md`

## Global Constraints

- Do not change the existing DIY stock recipe, Lotus reference calculations, or shared-calibration behavior.
- No API, database, migration, or new persistent user setting is needed.
- The recipe area is closed on initial page load.
- Counts are Watermancer estimates for DIY stocks, not claims about Lotus’s undisclosed commercial concentrate strengths.
- Use saved water-weight calibration when valid; otherwise use Lotus’s published style drop mass and label the result estimated.
- Use only Magnesium, Calcium, Potassium, and Sodium in the published presets; omit Bonus Epsom.

## Review Focus

1. Missing or partial calibration must use the selected style’s published drop mass and indicate an estimate. Test this in the dose-planning unit tests.
2. Round and Straight must use their own calibration when available. Test both styles with different measured water masses per drop.
3. The 50 mL minimum and 2 L maximum must produce finite nonnegative whole-drop counts. Test both boundaries.
4. Ingredients absent from a preset must show zero drops rather than a missing value. Test presets with zero-valued ingredients.
5. Changing only a stock batch size must not alter its strength or recipe count because the existing preparation ratio stays fixed. Pin this behavior in the dose-planning tests.

---

### Task 1: Calculate DIY Lotus recipe doses

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/lotusConcentrate.ts`
- Test: `artifacts/coffee-water-calculator/src/lotusConcentrate.test.ts`

**Interfaces:**
- Consumes: `LotusRecipe`, `LotusDropperStyle`, `LotusDropperCalibration`, `LOTUS_RECIPES`, `lotusIonTargetsExact`, `LOTUS_DROPPER_DEFINITIONS`, `LOTUS_SOURCE_DROP_MASS_MG`, and `lotusMassStockPlan`.
- Produces:

```ts
export type LotusRecipeStockId = 'magnesium' | 'calcium' | 'potassium' | 'sodium';

export interface LotusDiyRecipeDosePlan {
  counts: Record<LotusRecipeStockId, number>;
  dropMassSource: 'calibration' | 'lotus-reference';
}

export function calculateLotusDiyRecipeDoses(
  recipe: LotusRecipe,
  style: LotusDropperStyle,
  brewVolumeMl: number,
  calibration?: LotusDropperCalibration,
): LotusDiyRecipeDosePlan;
```

- [ ] **Step 1: Write failing calculation tests**

Add tests that assert:
- With no calibration, all seven presets at 450 mL match the existing published drop counts for Round and Straight using Lotus’s published average drop weights.
- A valid calibration uses `weightInput / dropsInput` grams per drop and reports `dropMassSource: 'calibration'`.
- Missing and partial calibrations use the published style mass and report `dropMassSource: 'lotus-reference'`.
- Counts scale with water volume, are nonnegative integers at 50 mL and 2 L, and contain all four stock IDs with zero for unused ingredients.
- Strength is derived from the existing per-salt mass-preparation ratio and is invariant to the batch size used to produce that ratio.

- [ ] **Step 2: Run the focused test and verify the intended failure**

Run: `pnpm --filter @workspace/coffee-water-calculator run test -- src/lotusConcentrate.test.ts`

Expected: FAIL because `calculateLotusDiyRecipeDoses` and its result types do not yet exist.

- [ ] **Step 3: Implement the pure dose planner**

In `lotusConcentrate.ts`, derive each stock’s ion mass per gram from the existing DIY mass-stock plan and the selected salt form. Use measured water grams per drop when calibration is valid; otherwise use `LOTUS_SOURCE_DROP_MASS_MG` for the chosen style. Convert each recipe’s cation target and brew-water volume to ion mass, divide by the matching DIY stock’s ion mass per drop, round to whole drops, and return the source used for drop mass.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `pnpm --filter @workspace/coffee-water-calculator run test -- src/lotusConcentrate.test.ts`

Expected: PASS, including exact parity with existing Lotus published counts when using Lotus’s published drop weights.

### Task 2: Add the collapsed recipe calculator

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/LotusMassPreparationPanel.tsx`
- Test: `artifacts/coffee-water-calculator/e2e/lotus-drop-output.spec.ts`

**Interfaces:**
- Consumes: `calculateLotusDiyRecipeDoses` and its `LotusDiyRecipeDosePlan` result from Task 1; existing `brewVolumeMl`, `style`, and `calibration` props; the seven entries in `LOTUS_RECIPES`.
- Produces: a collapsed-by-default `<details>` panel with a recipe selector and four compact dose rows.

- [ ] **Step 1: Write failing UI tests**

Add browser checks that verify the recipe panel starts collapsed beneath stock preparation, has all seven presets, shows no dose rows until a recipe is selected, and then displays four whole-drop values with the official source link and DIY-estimate disclosure.

- [ ] **Step 2: Run the focused browser tests and verify the intended failure**

Run: `pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/lotus-drop-output.spec.ts`

Expected: FAIL because the recipe panel is not present yet.

- [ ] **Step 3: Implement the recipe panel**

In `LotusMassPreparationPanel.tsx`, add the collapsed section after weight-based preparation. Keep the selector local to the panel, reuse the existing volume, style, and calibration props, display four stock counts, label the Lotus-reference fallback as estimated, and link to the official instructions. Do not add duplicate volume or tip controls.

- [ ] **Step 4: Run focused browser tests and verify recalculation**

Run: `pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/lotus-drop-output.spec.ts`

Expected: PASS for collapsed state, selected preset output, volume changes, and calibration changes.

- [ ] **Step 5: Run final project verification**

Run:
- `pnpm --filter @workspace/coffee-water-calculator run typecheck`
- `pnpm --filter @workspace/coffee-water-calculator run test`
- `pnpm --filter @workspace/coffee-water-calculator run build`
- `pnpm --filter @workspace/coffee-water-calculator run check:unused-live`

Expected: all commands pass. Inspect the app preview and confirm the new section remains below preparation, collapsed initially, and visually consistent with the existing Lotus cards.
