# Dropper Calibration Layout Implementation Plan

> **For agentic workers:** Implement this plan task-by-task in the current branch. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move shared dropper calibration below the DIY mineral selectors and make saved calibration status clear.

**Architecture:** Add a pure predicate that recognizes valid saved measurements for either tip style. Render the shared calibration panel at workspace level below the DIY mineral/hydration selectors, using its saved state only for the panel’s initial expanded state. Keep finished-stock calibration with each stock and leave recipe and Lotus layouts unchanged.

**Tech Stack:** React, TypeScript, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-dropper-calibration-layout-design.md`

## Global Constraints

- A saved calibration is valid only when both drop count and measured water weight are finite and greater than zero.
- Either straight or round tip calibration is enough to show the saved indicator and start collapsed on a later open.
- Do not add a separate completion checkbox or change dose calculations.
- Keep finished-stock measurements tied to their stock composition and tip.
- Do not change recipe or Lotus calibration placement.

## Review Focus

- No saved tips: panel starts expanded and shows no calibrated indicator.
- Valid straight-only or round-only data: panel starts collapsed and shows saved status.
- Zero, invalid, or incomplete values: panel stays expanded and is not marked calibrated.
- Selected tip lacks calibration while the other style has it: show saved availability without labeling the selected tip’s estimate as measured.
- Revisiting after entering calibration: the newly mounted panel starts collapsed; editing it in the current session does not collapse it mid-entry.

---

### Task 1: Move the shared calibration panel and honor saved status

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/lotusConcentrate.ts`
- Test: `artifacts/coffee-water-calculator/src/diyDropperCalibration.test.ts`
- Modify: `artifacts/coffee-water-calculator/src/MassConcentrateWorkspace.tsx`
- Test: `artifacts/coffee-water-calculator/e2e/concentrate-mass-workflow.spec.ts`

**Interfaces:**
- Produces: `hasAnyDiyDropperCalibration(calibrations: LotusStyleCalibrationInputs | undefined): boolean`
- The predicate returns true if either style passes the existing `lotusMeasuredDropsPerMl` validation.
- The workspace-level panel consumes the existing selected tip, per-style rates, saved calibration records, and update callback.

- [ ] **Step 1: Write unit tests for saved-calibration validity**

In `diyDropperCalibration.test.ts`, cover valid straight-only and round-only records, plus incomplete, zero, non-finite, and empty records. Assert only valid records return true.

- [ ] **Step 2: Run the unit test and confirm it fails**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/diyDropperCalibration.test.ts`

Expected: the test fails because `hasAnyDiyDropperCalibration` is not implemented.

- [ ] **Step 3: Implement the pure validity predicate**

Add `hasAnyDiyDropperCalibration` to `lotusConcentrate.ts`, reusing `lotusMeasuredDropsPerMl` for the same finite-positive validation used by rate resolution.

- [ ] **Step 4: Run the unit test and confirm it passes**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/diyDropperCalibration.test.ts`

Expected: all saved-calibration validity cases pass.

- [ ] **Step 5: Add browser coverage for placement and reopen behavior**

In `concentrate-mass-workflow.spec.ts`, verify the shared panel follows the mineral/hydration selectors, opens when no style is calibrated, shows saved status after a valid measurement, and starts collapsed after reload. Also verify one calibrated style is sufficient while the other style remains estimated.

- [ ] **Step 6: Run the browser tests and confirm the new cases fail**

Run: `PATH=/nix/store/jfar9wnj6kvr0gr6klh1gk7vgckkfr5j-nodejs-20.20.0/bin:$PATH PLAYWRIGHT_CHROMIUM_EXECUTABLE=/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts --project=chromium --workers=1 e2e/concentrate-mass-workflow.spec.ts`

Expected: the new location and saved-state assertions fail against the current layout.

- [ ] **Step 7: Relocate the shared panel below the DIY selectors**

  In `MassConcentrateWorkspace.tsx`, render one shared tip-calibration panel immediately below the DIY mineral and hydration selectors. Keep finished-stock calibration controls in each stock card, leave recipe/Lotus rendering unchanged, and update existing browser assertions to target the relocated panel.

- [ ] **Step 8: Show saved status and set the panel’s initial state**

  Add a checkmark and “Calibrated” status when either style has valid saved measurements. Set the panel’s initial expanded state from `hasAnyDiyDropperCalibration`; do not bind its `open` state continuously, so completing calibration does not collapse it during the current edit session.

- [ ] **Step 9: Run focused tests, typecheck, and build**

Run:

```bash
pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/diyDropperCalibration.test.ts
PATH=/nix/store/jfar9wnj6kvr0gr6klh1gk7vgckkfr5j-nodejs-20.20.0/bin:$PATH PLAYWRIGHT_CHROMIUM_EXECUTABLE=/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts --project=chromium --workers=1 e2e/concentrate-mass-workflow.spec.ts
pnpm --filter @workspace/coffee-water-calculator typecheck
pnpm --filter @workspace/coffee-water-calculator build
```

Expected: all targeted tests, typecheck, and build pass.
