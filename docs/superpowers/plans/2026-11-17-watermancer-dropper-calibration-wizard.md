# Watermancer Dropper Calibration Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a five-page Watermancer Guide calibration wizard that calculates multi-run dropper calibration and saves through the existing DIY calibration path.

**Architecture:** Keep calibration math in a React-free TypeScript module. Add a focused Radix dialog component for wizard state and presentation, then connect it to the existing Guide step and shared persistence callback. Preserve the current calibration cards and synchronize only the style saved by the wizard.

**Tech Stack:** React, TypeScript, Radix Dialog, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-watermancer-dropper-calibration-wizard-design.md`

## Global Constraints

- Do not change chemistry, solver behavior, or storage schema.
- Save with `withDiyLotusCalibration` and `saveDiyConcentrateInputs`; store summed drops and grams in existing calibration fields.
- Keep sharing limited to Watermancer Guide, DIY Stock Builder, and DIY Lotus Drops.
- Reuse existing photos; add no image files.
- Keep the dialog shared-height with a pinned footer, no desktop body scrolling at 1280 × 800, and visible navigation at 375 × 812.
- Do not modify the “How it works: salt targets, GH, and KH” dialog in this plan. Its separate 625 px height correction happens only after this wizard is fully built and verified.
- Do not push.

## Review Focus

- Blank, zero, negative, or incomplete optional runs must not distort the saved calibration; test that these runs are ignored.
- A single run must produce no spread value; test that the UI shows “—”.
- Exactly 5% spread must not warn, while a value above 5% must; cover both calculation boundary and visible warning.
- Saving one tip style must not overwrite the other style's saved or unsaved values; test persistence and card state.
- Long page 4 content and large images must not move the footer or hide Next; test viewport visibility, body overflow, and button position.

---

### Task 1: Calibration arithmetic

**Files:**
- Create: `artifacts/coffee-water-calculator/src/watermancerGuideCalibrationMath.ts`
- Test: `artifacts/coffee-water-calculator/src/watermancerGuideCalibrationMath.test.ts`

**Interfaces:**
- `CalibrationRunInput`: `{ dropsInput: string; weightInput: string }`
- `ValidCalibrationRun`: `{ drops: number; weightGrams: number; dropsPerMl: number }`
- `WatermancerCalibrationResult`: `{ validRuns: ValidCalibrationRun[]; totalDrops: number; totalWeightGrams: number; dropsPerMl: number | null; gramsPerDrop: number | null; spreadPercent: number | null; isValid: boolean }`. Use zero totals when no runs are valid; rate values are `null` until at least one run is valid, and `spreadPercent` is `null` until two runs are valid.
- `calculateWatermancerCalibration(runs: CalibrationRunInput[]): WatermancerCalibrationResult`

- [ ] **Step 1: Write failing tests** with these pinned cases:
  - `returnsCombinedRatesForOneRun`: 50 drops / 2 g gives 25 drops/mL, 0.04 g/drop, and `spreadPercent: null`.
  - `combinesThreeValidRuns`: 50/2, 100/4, 100/4 gives 250 total drops, 10 g, and 25 drops/mL.
  - `ignoresBlankZeroNegativeAndIncompleteRuns`: an invalid optional run does not change the totals from the valid run.
  - `computesSpreadAtExactlyFivePercent`: per-run rates of 102.5 and 97.5 drops/mL give 5%.
  - `computesSpreadJustOverFivePercent`: per-run rates of 102.6 and 97.5 drops/mL exceed 5%.
- [ ] **Step 2: Run the focused test and confirm it fails** because the module does not exist.

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/watermancerGuideCalibrationMath.test.ts`

Expected: FAIL with the missing module/function.

- [ ] **Step 3: Implement the plain TypeScript calculation module.** Accept a run only when both inputs parse to finite positive numbers; combine accepted values; compute combined drops/mL, grams/drop, and spread using the formula in the spec. Do not import React or storage code.
- [ ] **Step 4: Run the focused test and confirm all arithmetic cases pass.**
- [ ] **Step 5: Commit the calculation module and tests.**

### Task 2: Wizard dialog and Guide integration

**Files:**
- Create: `artifacts/coffee-water-calculator/src/WatermancerGuideCalibrationWizard.tsx`
- Modify: `artifacts/coffee-water-calculator/src/WatermancerGuide.tsx`
- Modify: `artifacts/coffee-water-calculator/src/watermancerGuideCalibration.test.ts`
- Create: `artifacts/coffee-water-calculator/e2e/watermancer-guide-calibration-wizard.spec.ts`

**Interfaces:**
- Wizard props: `calibrations: Partial<Record<LotusDropperStyle, LotusDropperCalibration>>`, `onSave(style: LotusDropperStyle, calibration: LotusDropperCalibration): void`.
- Save callback in `WatermancerGuide.tsx`: continue using `withDiyLotusCalibration(loadDiyConcentrateInputs(), style, calibration)` followed by `saveDiyConcentrateInputs(next)` and update local `savedCalibrations`.
- Dialog test IDs: `button-guided-calibration`, `guided-calibration-dialog`, `guided-calibration-page-1` through `guided-calibration-page-5`, `guided-calibration-next`, `guided-calibration-back`, `guided-calibration-close`, `guided-calibration-tip-straight`, `guided-calibration-tip-round`, `guided-calibration-run-{1,2,3}-{drops,weight}`, `guided-calibration-warning`, `guided-calibration-save`, and `guided-calibration-start-over`.

- [ ] **Step 1: Add failing browser tests before UI implementation.** Cover choosing and preselecting tips, three-run save reflected in the existing card, saving with optional runs skipped, Start over reset, >5% warning, required photo alt text and tip caption on each relevant page, phone Next visibility on every page, and desktop no-scroll plus identical Next position across pages.
- [ ] **Step 2: Run the new browser spec and confirm it fails because the wizard entry point is absent.**

Run: `pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/watermancer-guide-calibration-wizard.spec.ts`

Expected: FAIL on missing guided-calibration controls.

- [ ] **Step 3: Implement the five-page dialog.** Page 1 has selectable tip cards; page 2 explains tare and vertical posture beside the scale photo; page 3 has Run 1 inputs defaulting to 50 drops and the 0.1 g scale hint; page 4 has optional Run 2/3 inputs and live totals; page 5 has the result, warning, and Save/Start over actions. Reuse the existing assets, load only page 1 photos eagerly, lazy-load the rest, and add the required tip captions. Keep Run 1 mandatory, ignore incomplete optional runs, warn only when spread is greater than 5%, and make Start over clear entered runs and restore the 50-drop default.
- [ ] **Step 4: Integrate the entry button and save callback on the Guide’s Calibrate step.** Initialize the selected style to a saved valid calibration, or Straight when neither/both are saved. Save only summed valid values through the existing callback.
- [ ] **Step 5: Keep the existing cards intact and synchronize the newly saved calibration into the matching card draft only.** Verify the other style’s saved value and any unrelated card draft are preserved.
- [ ] **Step 6: Run the new browser spec and existing Guide calibration unit test.**

Run: `pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/watermancer-guide-calibration-wizard.spec.ts`

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/watermancerGuideCalibration.test.ts src/watermancerGuideCalibrationMath.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the wizard, Guide integration, and focused tests.**

### Task 3: Whole-feature verification

**Files:**
- Verify: all files changed by Tasks 1–2.
- Do not change `artifacts/coffee-water-calculator/src/SaltUnitsExplainer.tsx` or its existing browser test during Tasks 1–3.

- [ ] **Step 1: Run the full unit suite.**

Run: `pnpm --filter @workspace/coffee-water-calculator run test`

Expected: PASS.

- [ ] **Step 2: Run the full TypeScript check.**

Run: `pnpm --filter @workspace/coffee-water-calculator run typecheck`

Expected: PASS.

- [ ] **Step 3: Run the Watermancer Guide and calibration browser coverage.**

Run: `pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/watermancer-guide.spec.ts e2e/watermancer-guide-calibration-wizard.spec.ts`

Expected: PASS, including all required wizard interactions and viewport checks.

- [ ] **Step 4: Review the final diff to confirm the chemistry guide remains untouched and no storage schema, chemistry, solver, or image files changed. Do not push.**
