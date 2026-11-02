# Weight-based Concentrate Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all live concentrate tools use mass-based stock preparation and dosing, with consistent partial-water preparation and explicit legacy-stock handling.

**Architecture:** Add shared mass, calibration, preparation, and storage modules rather than extending the duplicated stock arithmetic in App.tsx. Migrate live stock surfaces to those interfaces while keeping historical volume data explicitly separate. Preserve the salt/ion engine, hydration corrections, recipe ×N meaning, and finished-water volume controls.

**Tech Stack:** React, TypeScript, Vite, Vitest, Playwright, existing local/account-sync storage.

**Spec:** `docs/superpowers/specs/2026-11-02-weight-based-concentrate-workflow-design.md`

## Global Constraints

- New stocks use total finished stock mass in grams, excluding the bottle.
- Physical salt mass includes the selected hydration form.
- Start with 20–30% of calculated **water mass**, not total stock mass; add salts, mix, then add remaining water to total stock weight without retaring.
- Exact shared explanation: “For plain water at room temperature, 1 mL ≈ 1 g, so you can weigh your water. This approximation does not apply to finished concentrate.”
- Keep ×N as N one-liter recipe equivalents; grams of stock per B liters = totalStockMassG × B / N.
- Never pass stock grams into a volume-based function as if they were mL.
- Water-only calibration stays an estimate. Exact stock drops require actual-stock mass calibration.
- Preserve compatibility/precipitation warnings, salt definitions, hydration forms, and the source commercial Lotus recipe references.
- Historical mL stocks must not silently become gram stocks; preserve original records and require an explicit rebuild for the new workflow.
- Do not reactivate removed Guide panels or archived workspaces. Do not change finished-water mg/L calculations or source-water inputs.
- Execute inline on the current branch as in the preceding work; commit coherent units locally, do not push.

## Review Focus

- Zero water, salt mass equal to/exceeding total stock mass, nonfinite values, and an impossible drop target must fail explicitly rather than produce a usable-looking zero.
- A hydration change must update physical salt/water mass and invalidate a measured-stock calibration tied to the old composition.
- Editing one separated stock must not change another stock's mass or calibration.
- A saved legacy volume stock must retain its original units and dose after refresh/import; a new gram stock must round-trip unchanged.
- Water-only calibration, source defaults, and another tip's calibration must never appear as measured finished-stock precision.

## Existing Code Map

- `src/App.tsx`: mass-based standalone `ConcentrateWorkspace`; DIY/Lotus stock builder; live `RecipeConcentrateBuilder`, single-salt and group cards; legacy builder; exported volume-based drop helpers; stock handoffs, snapshots, recipe steps, and text exports.
- `src/waterData.ts`: salt/hydration definitions and existing volume-based `checkConcentrate`/strength warning logic. Keep final-water math unchanged.
- `src/lotusConcentrate.ts`: published Lotus references, shared tip estimates, and homemade stock estimates. Currently treats an input named volume as grams of water and reports stock mg/mL incorrectly.
- `src/waterPlans.ts`: version-1 water plans with nested concentrate snapshot and currently untyped recipe plan.
- `src/accountSyncStorage.ts`: synchronized DIY stock inputs, including historical `stockWeightInput`, `stockVolumeInput`, and calibration fields.
- `src/WatermancerGuideStockPreparation.tsx`, `src/watermancerGuideStock.ts`, `src/WatermancerGuide.tsx`, `src/watermancerGuideContent.ts`: stock planning, mixing photos, current fill-volume input, water-drop estimates, and guide text.

Paths below are relative to `artifacts/coffee-water-calculator/` unless stated otherwise.

---

### Task 1: Shared mass calculations and preparation instructions

**Files:** Create `src/concentrateMass.ts`, `src/concentrateMass.test.ts`, `src/concentratePreparation.tsx`, `src/concentratePreparation.test.ts`.

**Interfaces:**
- `StockDropCalibration = { basis: 'stock' | 'water-estimate'; drops: number; massG: number; compositionKey: string; tipKey: string }`.
- `MassStockInput = { totalStockMassG: number; salts: Array<{ saltId: string; physicalMassMg: number }> }`.
- `buildMassStockPlan(input: MassStockInput)` returns `{ valid: true; totalStockMassG: number; totalSaltMassMg: number; waterMassG: number; initialWaterMinG: number; initialWaterMaxG: number; saltMgPerStockG: number; strengthPercentWw: number }` or `{ valid: false; reason: string }`.
- `resolveStockDropCalibration(calibration: StockDropCalibration | null, compositionKey: string, tipKey: string)` returns `{ gramsPerDrop: number | null; basis: 'stock' | 'water-estimate' | 'unavailable' }`. Mismatched stock composition or tip invalidates measured calibration; a different tip's water estimate is unavailable.
- `computeMassStockDose(input: { totalStockMassG: number; strength: number; finalLiters: number; calibration: StockDropCalibration | null; compositionKey: string; tipKey: string })` returns `{ valid: true; doseMassG: number; gramsPerDrop: number | null; drops: number | null; calibrationBasis: 'stock' | 'water-estimate' | 'unavailable' }` or `{ valid: false; reason: string }`. No measured drop count without valid calibration.
- `buildConcentratePreparationSteps({ totalStockMassG, waterMassG, saltLabel })` returns ordered plain-text steps for UI and exports; `ConcentratePreparationSteps` renders them and the shared water-only approximation note. Support an optional salt-detail slot so existing salt colors are retained.

- [ ] **Step 1:** Write tests asserting 100 g/5,000 mg gives 95 g water, 19–28.5 g initial water, 50 mg/g, 5% w/w; 100 g at ×20 for 2 L doses 10 g; 100 drops weighing 5 g gives 0.05 g/drop and 200 drops for that dose. Assert water-estimate provenance remains estimated, invalid calibration never becomes measured, and zero/negative/NaN/Infinity or salt ≥ stock mass are invalid.
- [ ] **Step 2:** Run `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/concentrateMass.test.ts src/concentratePreparation.test.ts`; expect missing-module/interface failures before implementation.
- [ ] **Step 3:** Implement the interfaces with full-precision internal arithmetic, formatting only at the display boundary. Preparation text must include taring once, the water-only approximation, wash-in using remaining water, extra remaining water if initial dissolution is incomplete, and final mixing/labeling.
- [ ] **Step 4:** Run the same focused command; expect all assertions green, including static-markup tests for the shared sequence and exact note.
- [ ] **Step 5:** Commit `feat: add shared mass-based stock planning and preparation`.

### Task 2: Versioned stock persistence and legacy classification

**Files:** Create `src/concentrateStockStorage.ts`, `src/concentrateStockStorage.test.ts`; modify `src/waterPlans.ts`, `src/waterPlans.test.ts`, `src/accountSyncStorage.ts`, `src/accountSyncStorage.test.ts` (create the test file if absent).

**Interfaces:**
- `MassConcentratePlanSnapshot = { version: 2; basis: 'mass'; strategy: 'individual' | 'gh-kh' | 'all-in-one'; groups: Array<{ id: string; totalStockMassG: number; strength: number; saltIds: string[]; calibration: StockDropCalibration | null }>; finalLiters: number }`.
- `readConcentrateStockRecord(value: unknown)` returns `{ kind: 'mass'; plan: MassConcentratePlanSnapshot }`, `{ kind: 'legacy-volume'; original: Record<string, unknown> }`, or `{ kind: 'invalid'; reason: string }`.
- Extend nested concentrate snapshots and synchronized inputs with explicit basis/version and stock-specific calibration fields. Leave the unrelated outer water-plan version unchanged if its existing optional-field compatibility allows it.

- [ ] **Step 1:** Add round-trip tests for version-2 groups and calibrations; old recipe groups containing `volumeMl` classify as legacy with unchanged numeric values. Existing genuinely mass-based standalone `totalStockMassInput`/DIY `stockWeightInput` retain mass meaning. Unknown old calibration weights do not become verified stock measurements. Reject malformed mixed-unit/version records explicitly.
- [ ] **Step 2:** Run focused Vitest on the three storage test files; expect new assertions to fail.
- [ ] **Step 3:** Implement schema-aware readers/writers and validation, not name/value heuristics or unchecked `as` casts. Preserve original legacy data. Retain account-scoped storage and synchronization notifications. Portable payloads carrying these snapshots use this same discriminator; salt-only share links do not require a gratuitous format change.
- [ ] **Step 4:** Re-run focused tests; verify legacy read does not mutate data, new mass records survive repeated save/load, and extra concentration fields do not drop existing account data.
- [ ] **Step 5:** Commit `feat: version stock mass data and preserve legacy volume records`.

### Task 3: Recipe concentrates, stock warnings, and handoffs

**Files:** Modify `src/App.tsx`, `src/concentrateRecipe.test.ts`, `src/waterData.ts`, `src/waterData.test.ts`; create `src/concentrateMassWarnings.ts`, `src/concentrateMassWarnings.test.ts`. Consume Tasks 1–2.

**Interfaces:**
- Add `RecipeMassStockInput = { saltTargets: Record<string, number>; formIdxBySaltId: Record<string, number>; strength: number; totalStockMassG: number; calibration: StockDropCalibration | null; finalLiters: number; compositionKey: string; tipKey: string }`.
- Add `computeRecipeMassDropEquivalents(input: RecipeMassStockInput)` to `concentrateMass.ts`. Return a discriminated valid/invalid result: valid output includes `doseMassG`, `batchDrops: number | null`, `calibrationBasis`, `totalSaltMgPerStockG`, `totalSaltMgPerDrop: number | null`, `ionPpmPerDrop: Partial<Record<IonId, number>> | null`, and `perSalt: Array<{ saltId: string; saltMgPerStockG: number; saltMgPerDrop: number | null }>`. Invalid output includes `reason`. Use existing salt definitions.
- Add `computeRecipeMassStrengthForPhysicalSaltPpm(input: Omit<RecipeMassStockInput, 'strength'> & { physicalSaltPpmPerDrop: number })` returning `{ valid: true; strength: number; calibrationBasis: 'stock' | 'water-estimate' }` or `{ valid: false; reason: string }`, using the same mass denominator and drop-mass provenance. Preserve DIY CaCO₃-equivalent versus physical-salt dose distinctions.
- `checkMassConcentrate({ strength, saltTargets, formIdxBySaltId, totalStockMassG })` returns existing warning-shaped records plus an explicit approximation/model note where applicable.

- [ ] **Step 1:** Add tests for recipe physical salt totals at ×1/×N, invariant final ions at 50/100/250 g stocks, ×20/2 L dose example, hydration-correct water remainder, rounded drops recomputing actual ions, and no measured drops from water-only calibration. Test one separate stock mass edit preserves its strength and scales only that stock; composition/tip changes invalidate only affected stock calibration.
- [ ] **Step 2:** Run focused recipe and mass-warning tests; expect failures for new APIs/mass behavior.
- [ ] **Step 3:** Implement shared recipe mass helpers and migrate all live recipe builders/cards, dose controls, plan snapshots, pinned salt contributions, and handoffs to unit-explicit mass fields. Use Task 1's preparation component. Keep source final-water volumes in liters. Remove live calls to old volume-based drop helpers; retain narrowly identified legacy readers/helpers only if still needed for historical display.
- [ ] **Step 4:** Add mass-aware warning checks using actual water mass for salt/water solubility ratios. Reuse current compatibility constraints and label stock-volume-dependent precipitation calculations as estimates; do not feed total stock grams directly into `checkConcentrate`'s mL argument. Preserve strength ceilings, conservative recommendations, and invalid-plan blocking.
- [ ] **Step 5:** Gate restored legacy-volume stock UI with its original units and a visible legacy notice. Add an explicit “Rebuild by weight” action requiring target stock mass; recompute the new plan while preserving original recipe targets, not physical bottle concentration. Do not auto-overwrite the old record.
- [ ] **Step 6:** Run focused mass/recipe/warning/storage tests plus app typecheck; expect all green and no mass-based UI plan with `volumeMl` as its calculation denominator.
- [ ] **Step 7:** Commit `feat: make recipe concentrates mass based`.

### Task 4: Standalone, DIY, Lotus-style stocks, and stock calibration

**Files:** Modify `src/App.tsx`, `src/lotusConcentrate.ts`, `src/lotusConcentrate.test.ts`, `src/diyDropperCalibration.test.ts`; add `src/concentrateCalibration.test.ts` if needed. Consume Tasks 1–3.

**Interfaces:** Use `buildMassStockPlan`, versioned storage, and `StockDropCalibration`. Add `lotusMassStockPlan(dropper, totalStockMassG)` to `lotusConcentrate.ts`, returning physical salt mass, water mass, and mg per stock gram while keeping published Lotus reference outputs separate.

- [ ] **Step 1:** Add tests for standalone 5% w/w values, DIY physical-salt and CaCO₃-equivalent targets using stock grams/drop, and Lotus-derived salt:water ratio converted to total mass as salt = total × ratio/(1 + ratio). Assert a 100 g homemade Lotus-style plan's salt plus water totals 100 g and its reference commercial recipe values remain unchanged.
- [ ] **Step 2:** Run focused Lotus/calibration/mass tests and verify the new assertions fail.
- [ ] **Step 3:** Migrate standalone preparation, DIY/Lotus-style stock targets, dose previews, hydration edits, labels, and inverse dose controls to total mass and actual-stock g/drop. Preserve single-salt % w/w behavior already correct. Give water-based/default calibration a conspicuous estimate label and a usable action/input to weigh counted **finished stock** drops vertically.
- [ ] **Step 4:** Bind measured calibration to stock composition and tip, clearing verification when either changes. Shared water-tip estimates stay separate from stock-specific calibration. Use schema-aware restore and explicit legacy rebuild; do not overwrite commercial Lotus references or pretend the old water-ratio input was total stock mass.
- [ ] **Step 5:** Replace local preparation wording with Task 1's component and preserve salt/form colors. Run the focused tests and app typecheck; expect green.
- [ ] **Step 6:** Commit `feat: align DIY stocks and calibration with mass dosing`.

### Task 5: Watermancer Guide and every preparation/export explanation

**Files:** Modify `src/watermancerGuideStock.ts`, `src/watermancerGuideStock.test.ts`, `src/WatermancerGuideStockPreparation.tsx`, `src/WatermancerGuideStockPreparation.test.ts`, `src/WatermancerGuide.tsx`, `src/watermancerGuideContent.ts`, `src/watermancerGuideContent.test.ts`, and current preparation/export branches in `src/App.tsx`. Update guide calibration tests where their labels/provenance change.

**Interfaces:** Replace the Guide's working-fill-volume stock target with total stock mass. `calculateOneMgPerDropStockPlan(totalStockMassG, calibration: StockDropCalibration)` delegates to shared mass helpers; its output uses gram fields and explicit estimate/measured status. It must not return a calculated stock volume or density-derived “minimum capacity.”

- [ ] **Step 1:** Update Guide tests to expect “Target stock weight” in grams, water-only approximation copy, the new preparation order, and no “1 mL ≈ 1 g of total mix.” With 50 g total and a 0.05 g/drop planning estimate, show 1 g salt and 49 g water with 9.8–14.7 g initial water, clearly marked estimated until actual-stock verification.
- [ ] **Step 2:** Run focused Guide tests and verify expected copy/plan failures.
- [ ] **Step 3:** Update Guide inputs/state, calibration explanation, stock cards, photos, references, and shared sequence. Keep bottle headroom qualitative or user-capacity-based without claiming stock grams equal occupied mL. Retain the parchment wash-in and vertical-dropper reminders.
- [ ] **Step 4:** Audit live preparation instructions and text/JPG/export labels in App.tsx and Guide content. Route stock preparation steps through the shared formatter/component. Remove volume-based instructions from active mass-stock paths, including recipe step modals and downloaded preparation text. Keep non-stock finished-water top-up instructions distinct.
- [ ] **Step 5:** Run focused Guide/preparation/recipe tests and typecheck; verify removed Asami Guide prep panel stays removed and source recipe/tasting content unchanged.
- [ ] **Step 6:** Commit `feat: unify concentrate guides and exported preparation steps`.

### Task 6: Cross-workflow verification and regression coverage

**Files:** Modify `e2e/concentrates-mode.spec.ts`; create `e2e/concentrate-mass-workflow.spec.ts`; update only existing tests whose old units genuinely changed. Update relevant `.agents/memory/` topics when implementation is confirmed.

- [ ] **Step 1:** Add browser cases for standalone 100 g/5%, recipe separate/all-in-one masses and gram doses, actual-stock calibration versus water estimate, Guide partial-water sequence, and legacy-volume restore → explicit rebuild → refresh. Seed real saved-record fixtures without auth bypasses.
- [ ] **Step 2:** Run the new browser cases against the web workflow and verify them; if the known runner-startup problem recurs, do not repeat identical timed-out commands. Use the browser-use skill for direct CDP checks if available and report any remaining automation limitation plainly.
- [ ] **Step 3:** Run full verification: `pnpm --filter @workspace/coffee-water-calculator test`, `pnpm --filter @workspace/coffee-water-calculator typecheck`, and `pnpm --filter @workspace/coffee-water-calculator build`. Check changed E2E files with TypeScript as well; unit count should not decrease by deleting assertions.
- [ ] **Step 4:** Review live concentrate paths for lingering volume-denominator arithmetic, schema-less restore casts, and water-calibration-as-measured-stock claims. Check saved plans and account sync retain both new fields and legacy records. Ensure no unrelated finished-water recipes/ion targets changed.
- [ ] **Step 5:** Restart `artifacts/coffee-water-calculator: web` once after the final change batch, inspect logs, capture app screenshots, and present the existing artifact. Do not restart unrelated workflows or push/publish automatically.
- [ ] **Step 6:** Update stale memory guidance to the verified mass basis, commit `test: cover weight-based concentrate workflows`, and report completed verification and any genuine remaining limitation.

## Execution Handoff

Implement inline on the current branch with the existing user-approved execution approach. Review each coherent task's diff and tests before proceeding. No project-task-agent dispatch or push is part of this plan. Ask for the user's review of this plan before implementation.
