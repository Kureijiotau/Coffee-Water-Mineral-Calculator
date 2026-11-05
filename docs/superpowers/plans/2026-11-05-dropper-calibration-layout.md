# Simple Mass-Based Concentrate Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify concentrate preparation, keep concentrate calculations mass-based, and open the correct recipe workspace for the active calculator mode.

**Architecture:** Convert displayed batch-water amounts to equivalent water mass at the UI boundary and pass mass units through stock-dose calculations. Simplify DIY single-salt preparation to one recipe-based stock flow with separate per-tip calibration and dosing-tip choice. Route the Concentrates tab from the active mode’s salt targets and share a salt-first preparation sequence with the Watermancer guide.

**Tech Stack:** React, TypeScript, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-dropper-calibration-layout-design.md`

## Global Constraints

- All concentrate calculations and stock sizes remain mass-based.
- The batch-water field may display liters or gallons, but calculations use equivalent water mass.
- Explain mL≈g only for plain water; do not apply it to finished concentrate.
- Add salt before water, rinse clinging salt with measured water, leave shake headspace, and mix until dissolved.
- A saved tip calibration is valid only when both drop count and measured water weight are finite and greater than zero.
- Either Straight or Round calibration is enough for calibrated status and for collapsing the section on a later open.
- Preserve saved DIY stock and calibration data; do not migrate or reinterpret legacy volume-based stocks.
- Keep Recipe Concentrate and Lotus controls and displayed dose behavior unchanged; their water math must also use equivalent mass with numerically unchanged results.

## Review Focus

- An empty active recipe opens DIY without creating or overwriting a recipe handoff.
- Brewer, Alchemist, and Watermancer use different active salt-target sources; each handoff must contain the current mode’s actual targets.
- A user with only one calibrated style must still see the other selected tip as estimated.
- A previously saved percent-mode plan must not re-expose a hidden target mode or lose its saved stock/calibration fields.
- Salt mass at or above total stock mass must be rejected rather than produce zero or negative water.
- The obsolete 20–30% partial-water recommendation must disappear from generated plans, recipe preparation, and the Watermancer guide.

---

### Task 1: Convert displayed batch water to mass before dose calculations

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/concentrateMass.ts`
- Test: `artifacts/coffee-water-calculator/src/concentrateMass.test.ts`
- Modify: `artifacts/coffee-water-calculator/src/MassConcentrateWorkspace.tsx`

**Interfaces:**
- Produces: `waterLitersToEquivalentMassKg(liters: number): number`, using the plain-water 1 kg/L approximation and preserving non-finite inputs.
- Changes `RecipeMassStockInput.finalLiters` and `computeMassStockDose` to accept `finalWaterMassKg`.

- [ ] **Step 1: Add failing tests for the water-mass boundary and remove partial-fill outputs**

In `concentrateMass.test.ts`, assert that 2 L of plain water maps to 2 kg, non-finite water input remains invalid, and dose, recipe-equivalent, and physical-mg/L strength calculations use `finalWaterMassKg` with numerically unchanged results. Assert `buildMassStockPlan` no longer returns `initialWaterMinG` or `initialWaterMaxG`, and rejects salt mass both equal to and greater than total stock mass.

- [ ] **Step 2: Run the focused unit test and confirm failure**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/concentrateMass.test.ts`

Expected: the conversion helper is missing and the mass-named calculation input is not accepted.

- [ ] **Step 3: Implement the explicit conversion boundary**

Add `waterLitersToEquivalentMassKg` in `concentrateMass.ts`; use `finalWaterMassKg` in stock-dose, recipe-equivalent, and physical-mg/L strength calculations. Remove the obsolete partial-water range fields from `buildMassStockPlan`. Convert the normalized displayed water amount to equivalent mass once in `MassConcentrateWorkspace.tsx`, then use that mass for every dose, target-strength, and per-drop calculation. Keep liters/gallons only for input conversion and user-facing labels; preserve the existing mg/L and liter displays through the 1 kg/L water equivalence.

- [ ] **Step 4: Run the focused unit test and confirm it passes**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/concentrateMass.test.ts`

Expected: water conversion and stock-dose tests pass with unchanged numerical results.

### Task 2: Simplify DIY stock controls and separate calibration from tip choice

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/lotusConcentrate.ts`
- Test: `artifacts/coffee-water-calculator/src/diyDropperCalibration.test.ts`
- Modify: `artifacts/coffee-water-calculator/src/MassConcentrateWorkspace.tsx`
- Test: `artifacts/coffee-water-calculator/e2e/concentrate-mass-workflow.spec.ts`

**Interfaces:**
- Produces: `hasAnyDiyDropperCalibration(calibrations: LotusStyleCalibrationInputs | undefined): boolean`.
- The shared calibration panel edits Straight and Round measurements independently; `Stock dropper tip` separately selects the dosing style.
- A selected tip uses its saved measured rate when valid and its existing estimate otherwise.
- This task follows Task 1 and must retain the mass-only calculation boundary while changing the workspace layout.

- [ ] **Step 1: Write unit cases for saved-calibration validity**

In `diyDropperCalibration.test.ts`, cover valid Straight-only and Round-only records, plus incomplete, zero, non-finite, empty, and undefined data.

- [ ] **Step 2: Run the unit test and confirm failure**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/diyDropperCalibration.test.ts`

Expected: the new validity helper is missing.

- [ ] **Step 3: Implement the pure calibration-validity helper**

Add `hasAnyDiyDropperCalibration` to `lotusConcentrate.ts`, reusing `lotusMeasuredDropsPerMl` for finite-positive validation.

- [ ] **Step 4: Run the unit test and confirm it passes**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/diyDropperCalibration.test.ts`

Expected: only valid data for at least one style returns true.

- [ ] **Step 5: Add failing browser coverage for the simplified flow**

In `concentrate-mass-workflow.spec.ts`, verify salt/hydration → calibration → separate dosing-tip choice → stock weight/batch water → dose basis/amount → preparation order; assert Advanced stock targets and Recipe target / % w/w controls are absent. Seed an existing percent-mode snapshot and verify the simplified UI retains stock/calibration data without exposing percent controls. Verify one valid style shows saved status, the panel stays open during entry, and reopens collapsed while the other selected tip remains estimated.

- [ ] **Step 6: Run the focused browser test and confirm failure**

Run: `PATH=/nix/store/jfar9wnj6kvr0gr6klh1gk7vgckkfr5j-nodejs-20.20.0/bin:$PATH PLAYWRIGHT_CHROMIUM_EXECUTABLE=/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts --project=chromium --workers=1 --grep='simplified DIY flow' e2e/concentrate-mass-workflow.spec.ts`

Expected: the existing advanced targets, combined calibration/style control, or placement fails the new assertions.

- [ ] **Step 7: Render only the simple DIY stock controls**

In `MassConcentrateWorkspace.tsx`, remove the DIY Recipe target / % w/w selector. Render the independent Straight/Round calibration panel immediately after salt and hydration selection, then add a separate dosing-tip selector before stock weight and batch water. Keep finished-stock calibration tied to each stock card and preserve the Lotus tab.

- [ ] **Step 8: Preserve saved values and set the calibrated initial state**

Normalize a legacy percent-mode DIY plan to the recipe-based simplified interface without deleting its saved stock weight, calibration, or stored percent field. Show a checkmark and “Calibrated” when either tip is valid. Use the saved validity only for the panel’s initial open state so entering a calibration does not collapse it mid-session.

- [ ] **Step 9: Run the focused browser test and confirm it passes**

Run the same Playwright command from Step 6.

Expected: the simple sequence, saved snapshot handling, calibration state, and estimated-tip behavior pass.

### Task 3: Route Concentrates from the active calculator recipe

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/App.tsx`
- Test: `artifacts/coffee-water-calculator/e2e/concentrates-mode.spec.ts`

**Interfaces:**
- Brewer targets come from `brewerActiveSaltTargets`.
- Alchemist targets come from `saltTargets`.
- Watermancer targets come from `activeWatermancerSaltTargets`.
- Positive targets refresh Recipe Concentrate’s handoff; an empty recipe selects DIY without creating or overwriting a handoff.

- [ ] **Step 1: Add failing browser cases for the three modes**

In `concentrates-mode.spec.ts`, verify an empty Alchemist recipe opens DIY, and a positive Brewer, Alchemist, or Watermancer recipe opens Recipe Concentrate with the corresponding current salt amounts.

- [ ] **Step 2: Run the focused browser tests and confirm failure**

Run: `PATH=/nix/store/jfar9wnj6kvr0gr6klh1gk7vgckkfr5j-nodejs-20.20.0/bin:$PATH PLAYWRIGHT_CHROMIUM_EXECUTABLE=/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts --project=chromium --workers=1 e2e/concentrates-mode.spec.ts`

Expected: the top-level handler still always selects DIY or sends targets from the wrong calculator mode.

- [ ] **Step 3: Use the active mode’s targets for routing and handoff**

Update the top-level Concentrates handler to choose the correct target source and refresh the existing handoff when any target is positive. Keep the empty-recipe path on DIY and leave prior handoff data untouched.

- [ ] **Step 4: Run the focused browser tests and confirm they pass**

Run the same Playwright command from Step 2.

Expected: the empty fallback and all three active-mode recipe handoffs pass.

### Task 4: Apply the salt-first mass preparation steps everywhere

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/watermancerGuideStock.ts`
- Test: `artifacts/coffee-water-calculator/src/watermancerGuideStock.test.ts`
- Modify: `artifacts/coffee-water-calculator/src/concentratePreparation.tsx`
- Test: `artifacts/coffee-water-calculator/src/concentratePreparation.test.ts`
- Modify: `artifacts/coffee-water-calculator/src/watermancerGuideContent.ts`
- Test: `artifacts/coffee-water-calculator/src/watermancerGuideContent.test.ts`
- Modify: `artifacts/coffee-water-calculator/src/WatermancerGuideStockPreparation.tsx`
- Test: `artifacts/coffee-water-calculator/src/WatermancerGuideStockPreparation.test.ts`
- Update preparation assertions: `artifacts/coffee-water-calculator/e2e/concentrate-mass-workflow.spec.ts`
- Update preparation assertions: `artifacts/coffee-water-calculator/e2e/watermancer-guide.spec.ts`

**Interfaces:**
- `buildConcentratePreparationSteps({ totalStockMassG, waterMassG, saltLabel })` returns the shared salt-first mass procedure.
- Watermancer guide fallback copy matches the shared procedure.

- [ ] **Step 1: Add failing tests for the approved preparation order**

In `concentratePreparation.test.ts`, assert: tare once → add salt → rinse with measured water → add water to total stock weight → leave headspace → shake to dissolve. Update `watermancerGuideStock.test.ts` to reject obsolete partial-water range outputs. Update `watermancerGuideContent.test.ts`, `WatermancerGuideStockPreparation.test.ts`, and the related e2e assertions to reject water-first wording and verify aligned fallback copy.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/concentrateMass.test.ts src/watermancerGuideStock.test.ts src/concentratePreparation.test.ts src/watermancerGuideContent.test.ts src/WatermancerGuideStockPreparation.test.ts`

Expected: the current shared steps and guide copy still direct users to add water before salt.

- [ ] **Step 3: Implement the shared salt-first preparation helper**

Update `buildConcentratePreparationSteps` to tare once, weigh in salt, rinse clinging crystals with measured water, add water to the target total mass, and leave headspace before shaking and labeling. Remove the partial-water range outputs from `calculateOneMgPerDropStockPlan`.

- [ ] **Step 4: Align Watermancer guide copy**

Update `watermancerGuideContent.ts` and `WatermancerGuideStockPreparation.tsx` fallback copy to match the helper while retaining the plain-water mL≈g explanation. Update old 20–30% preparation assertions in both e2e files.

- [ ] **Step 5: Run the focused tests and confirm they pass**

Run the same Vitest command from Step 2, then run:

```bash
PATH=/nix/store/jfar9wnj6kvr0gr6klh1gk7vgckkfr5j-nodejs-20.20.0/bin:$PATH PLAYWRIGHT_CHROMIUM_EXECUTABLE=/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts --project=chromium --workers=1 e2e/concentrate-mass-workflow.spec.ts e2e/watermancer-guide.spec.ts
```

Expected: shared and guide instructions use the salt-first sequence and water-only mass note, with no 20–30% partial-water instructions.

### Task 5: Run complete focused verification

- [ ] **Step 1: Run related unit tests**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/concentrateMass.test.ts src/diyDropperCalibration.test.ts src/watermancerGuideStock.test.ts src/concentratePreparation.test.ts src/watermancerGuideContent.test.ts src/WatermancerGuideStockPreparation.test.ts`

Expected: all mass, calibration, and preparation tests pass.

- [ ] **Step 2: Run related browser tests**

Run: `PATH=/nix/store/jfar9wnj6kvr0gr6klh1gk7vgckkfr5j-nodejs-20.20.0/bin:$PATH PLAYWRIGHT_CHROMIUM_EXECUTABLE=/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts --project=chromium --workers=1 e2e/concentrate-mass-workflow.spec.ts e2e/concentrates-mode.spec.ts e2e/watermancer-guide.spec.ts`

Expected: simplified concentrate workflow, active-mode routing, and Watermancer guide tests pass in Chromium.

- [ ] **Step 3: Run typecheck and production build**

Run:

```bash
pnpm --filter @workspace/coffee-water-calculator typecheck
pnpm --filter @workspace/coffee-water-calculator build
```

Expected: both commands complete successfully.
