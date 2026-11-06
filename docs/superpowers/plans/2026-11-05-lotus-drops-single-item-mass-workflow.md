# Lotus Drops Single-Item Mass Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refocus DIY Lotus Drops on preparing one selected dropper at a time by finished stock mass, without changing Lotus reference or ion math.

**Architecture:** Keep the source-based Lotus estimator and `lotusMassStockPlan` as the chemistry boundary. Refactor `LotusDropsSection` to select one dropper, reuse the existing shared tip calibration, and render one mass-based preparation result with the existing preparation-step component.

**Tech Stack:** React, TypeScript, Vitest, Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-05-lotus-drops-single-item-mass-workflow-design.md`

## Global Constraints

- Keep the current Lotus drop and ion calculations unchanged.
- The finished-stock target is salt plus water; the bottle is excluded.
- Keep preparation and all stock calculations weight-based. Mention mL ≈ g only as a convenience for plain water.
- Calibration determines drops per mL and calibrated per-drop guidance only. It must never change the Lotus salt-to-water ratio or the salt mass for a given finished stock mass.
- Show the selected ion's calibrated ppm-per-drop value for the selected final brewing-water volume separately from the Lotus source-model reference.
- The brew-volume slider defaults to 450 mL, offers mL/L/Gal display units, ranges from 50 to 2000 mL in 10 mL increments, and resets to 450 mL.
- Brew volume rescales the displayed ppm references only; published Lotus drop counts, source-model ion amounts per drop, and concentrate preparation masses remain unchanged.
- Do not claim to know Lotus's undisclosed stock concentrations or hydration forms.
- Keep Bonus Epsom visibly distinct from Lotus products.
- Do not change regular recipe concentrates or other calculator modes.

## Review Focus

- Blank, non-finite, zero, or negative target mass must not show a preparation result; cover with the UI test.
- Partial or invalid calibration for the selected style must keep the stock amount/result gated; cover with the UI test.
- Switching to an uncalibrated style must reapply the calibration gate even if the other style is calibrated; cover with the browser test.
- Selecting each commercial dropper or Bonus Epsom must show only its matching salt and preserve the correct form; cover with the browser test.
- Editing calibration at a fixed target mass must change per-drop guidance but not the salt/water quantities; cover with unit and browser tests.

---

### Task 1: Protect Lotus Preparation Math

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/lotusConcentrate.test.ts`
- Test: `artifacts/coffee-water-calculator/src/lotusConcentrate.test.ts`

**Interfaces:**
- Consumes: `LOTUS_DROPPER_DEFINITIONS`, `lotusMassStockPlan`, `lotusStockPlan`, `lotusCalibratedStockPlan`
- Produces: Regression coverage proving the existing reference and mass-based preparation behaviors remain unchanged; no production API changes.

- [ ] **Step 1: Add ratio and mass-balance regression tests**

Add tests covering all four Lotus droppers and Bonus Epsom at two positive finished masses. Assert each plan is valid, salt mass plus water mass equals the requested total, and salt-to-water ratio matches `lotusStockPlan(dropper, 'straight', 100)`.

- [ ] **Step 2: Run the focused test and confirm existing behavior**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/lotusConcentrate.test.ts`
Expected: PASS; if the baseline fails, stop and report the existing mismatch rather than changing Lotus formulas.

- [ ] **Step 3: Add calibration-invariance coverage**

Assert that fixed-mass outputs from `lotusMassStockPlan` are independent of Round/Straight calibration and that the existing Lotus fixed-reference values and calibrated per-drop values retain their current separate behavior.

- [ ] **Step 4: Run the focused test**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/lotusConcentrate.test.ts`
Expected: PASS with the Lotus source and ion outputs unchanged.

---

### Task 2: Build the Single-Dropper Mass Workflow

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/App.tsx:10091-10813`
- Use: `artifacts/coffee-water-calculator/src/lotusConcentrate.ts:377-412`
- Use: `artifacts/coffee-water-calculator/src/concentratePreparation.tsx:1-21`

**Interfaces:**
- Consumes: The existing `style` / `onStyleChange` props, shared calibration state, `lotusMassStockPlan(dropper, totalStockMassG)`, `lotusCalibratedStockPlan(...)`, and `ConcentratePreparationSteps`.
- Produces: A single selected Lotus dropper workflow. Keep the selected style calibration and per-drop reference output separate from the finished-mass calculation; do not change shared calibration persistence or Lotus chemistry APIs.

- [ ] **Step 1: Add a failing browser test for the one-dropper selector and calibration gate**

Update `artifacts/coffee-water-calculator/e2e/lotus-drop-output.spec.ts` to select DIY Lotus Drops, verify only the selected commercial dropper is the active preparation target, and assert no mass result appears until a valid calibration exists for the selected tip style.

- [ ] **Step 2: Run the focused browser test and verify the expected failure**

Run: `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts e2e/lotus-drop-output.spec.ts`
Expected: FAIL because the current screen shows all preparation cards and does not gate stock preparation on calibration.

- [ ] **Step 3: Refactor `LotusDropsSection` to select one dropper**

Keep the four official droppers and optional Bonus Epsom in one selector. Show the selected salt, formula, and existing hydration form read-only; preserve Bonus Epsom's non-Lotus label. Remove the all-droppers-as-equal-primary-card presentation without changing Lotus source calculations.

- [ ] **Step 4: Add the selected-style calibration gate and finished-mass input**

Reuse the saved Round/Straight calibration controls. Allow a positive finite finished-stock mass only when the selected style has valid calibration; otherwise keep the mass input/result disabled or unavailable and show the relevant calibration controls. Initialize the mass field empty.

- [ ] **Step 5: Render batch masses and ordered preparation instructions**

Use `lotusMassStockPlan` for salt and water grams. Add a 50–2000 mL brew-volume slider with 10 mL increments, 450 mL default, mL/L/Gal display toggles, and a reset-to-450-mL button. Scale the selected dropper's source and calibrated ppm-per-drop references to that volume while keeping source-model ion quantities per drop, official Lotus recipe drops, and stock preparation masses unchanged. Use `ConcentratePreparationSteps` with a salt label containing the calculated salt mass and the target total mass; retain the water-only 1 g ≈ 1 mL note.

- [ ] **Step 6: Run the focused browser test and verify the main interaction path**

Run: `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts e2e/lotus-drop-output.spec.ts`
Expected: PASS for selecting a dropper, calibrating the selected style, entering a batch mass, and showing the correct single preparation result.

---

### Task 3: Verify Lotus References, Bonus Epsom, and Invalid States

**Files:**
- Modify: `artifacts/coffee-water-calculator/e2e/lotus-drop-output.spec.ts`
- Test: `artifacts/coffee-water-calculator/e2e/diy-dropper-calibration.spec.ts`
- Test: `artifacts/coffee-water-calculator/src/lotusConcentrate.test.ts`

**Interfaces:**
- Consumes: The selected-dropper and mass-preparation UI from Task 2; existing calibration and calculation APIs.
- Produces: End-to-end regression coverage for the non-goals and acceptance criteria.

- [ ] **Step 1: Add browser assertions for dropper-specific content and optional Bonus Epsom**

Verify every selector option resolves to its expected salt/form, only one preparation target is shown, Bonus Epsom remains optional and labeled as an extra, and source-reference values remain distinct from the calibrated row.

- [ ] **Step 2: Add browser assertions for invalid mass and style switching**

Verify blank/invalid/non-positive masses do not produce ingredient quantities, an uncalibrated selected style blocks preparation, switching back to a calibrated style restores eligibility, and changing brew volume rescales ppm references without changing recipe drops or preparation masses.

- [ ] **Step 3: Run focused Lotus and shared-calibration tests**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/lotusConcentrate.test.ts src/diyDropperCalibration.test.ts`
Expected: PASS with shared calibration still working for its existing consumers.

- [ ] **Step 4: Run browser tests for Lotus output and shared calibration**

Run: `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts e2e/lotus-drop-output.spec.ts e2e/diy-dropper-calibration.spec.ts`
Expected: PASS with the original published-reference behavior preserved and the new single-dropper mass workflow usable.

- [ ] **Step 5: Run package typecheck and production build**

Run: `pnpm --filter @workspace/coffee-water-calculator run typecheck && pnpm --filter @workspace/coffee-water-calculator run build`
Expected: Both commands exit successfully.

- [ ] **Step 6: Restart the web workflow and verify the Lotus page in Preview**

Confirm the Lotus selector, calibration gate, mass calculation, and preparation steps render correctly after workflow restart; inspect browser and workflow logs for errors.

- [ ] **Step 7: Commit the completed implementation**

Commit only the implementation and test changes for this feature; do not push.
