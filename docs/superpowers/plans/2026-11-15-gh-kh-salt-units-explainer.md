# GH/KH and Salt Units Explainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an illustrated, live-data explainer that clarifies salt mass, ion concentration, GH, KH, and TDS without changing recipe calculations.

**Architecture:** Add a pure TypeScript breakdown helper that reuses the existing salt and ion calculations, then pass its output into an on-demand illustrated dialog attached to the Brewer/Alchemist salt summary. Keep the guide display-only and keep the existing Watermancer interface unchanged.

**Tech Stack:** React, TypeScript, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-15-gh-kh-salt-units-explainer-design.md`

## Global Constraints

- The explainer appears only in the existing Brewer and Alchemist recipe-summary card; it does not add a Watermancer control.
- Salt-row targets are anhydrous-equivalent concentration in ppm (approximately mg/L in dilute water); direct dose is physical mass to weigh.
- GH is derived from calcium and magnesium; KH is derived from bicarbonate and carbonate, expressed as ppm CaCO₃-equivalent.
- Chloride and sulfate do not contribute to GH or KH.
- TDS remains the modeled sum of salt-derived ion concentrations, not the GH/KH equivalent.
- The explainer uses the active recipe's current salt targets, selected hydration forms, and brew volume.
- No existing recipe or solver result changes.

## Review Focus

- No active salts or a nonpositive/non-finite volume must show an empty-state explanation rather than stale results; pin this in the breakdown-helper tests.
- Changing hydration form must change physical weighed mass without changing the target ion profile; pin this in the breakdown-helper tests.
- Changing batch volume must scale weighed salt mass while preserving concentration-derived GH/KH; pin this in the breakdown-helper tests.
- Salts with chloride/sulfate, bicarbonate/carbonate, and calcium/magnesium must be attributed only to the correct GH/KH values; pin this in the breakdown-helper tests.
- Switching recipes or calculator modes while the dialog is open must not preserve stale contribution data; pin this in the browser test.

---

### Task 1: Calculate Live Salt Contributions

**Files:**
- Create: `artifacts/coffee-water-calculator/src/saltUnitsExplainer.ts`
- Test: `artifacts/coffee-water-calculator/src/saltUnitsExplainer.test.ts`
- Read-only reference: `artifacts/coffee-water-calculator/src/waterData.ts`

**Interfaces:**
- Consumes: existing `SALTS`, `IonId`, `computeIonTotals`, `computeSaltMg`, `computeGH`, and `computeKH`.
- Produces: `calculateSaltUnitsBreakdown(input: SaltUnitsInput): SaltUnitsBreakdown`.
- `SaltUnitsInput` contains `saltTargets: Record<string, number>`, `formIndexBySaltId: Record<string, number>`, and `liters: number`.
- Each returned contribution contains the salt ID/name, anhydrous-equivalent target ppm, physical weighed mass in mg, per-ion concentration in mg/L, and per-salt GH/KH as CaCO₃-equivalent ppm. The breakdown also contains total GH, KH, TDS, and an availability flag.
- Invalid/nonpositive volume or no positive finite salt targets returns an unavailable, zero-valued breakdown with no stale rows.
- If a supplied hydration-form index is invalid for a salt, use that salt's `defaultFormIdx ?? 0` so the explainer remains safe and consistent with existing salt defaults.

- [ ] **Step 1: Write the failing helper tests**

Test a magnesium-chloride target of 40 ppm at one liter with its selected hydrated form; assert the physical weigh mass is hydration-adjusted, the magnesium concentration is derived from the salt's ion fraction, and GH is calculated from magnesium rather than copied as 40. Test that a bicarbonate salt contributes KH, chloride/sulfate contribute neither GH nor KH, a two-liter batch doubles weighed mass without changing concentration-derived results, and empty/invalid inputs are unavailable.

- [ ] **Step 2: Run the helper tests and confirm the expected failures**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/saltUnitsExplainer.test.ts`
Expected: FAIL because the breakdown helper is not implemented.

- [ ] **Step 3: Implement `calculateSaltUnitsBreakdown`**

Use `computeSaltMg` for hydration-aware physical mass, compute each active salt's ions using the existing ion model, and use `computeGH` / `computeKH` for each contribution and totals. Do not add a second chemistry formula.

- [ ] **Step 4: Run helper tests and confirm they pass**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/saltUnitsExplainer.test.ts`
Expected: PASS, including zero-volume, empty-salt, invalid-form-index, hydration, batch-volume, and counter-ion cases.

- [ ] **Step 5: Commit the tested breakdown**

Commit the helper and unit tests together after their focused tests pass.

---

### Task 2: Add the Illustrated Summary Explainer

**Files:**
- Create: `artifacts/coffee-water-calculator/src/SaltUnitsExplainer.tsx`
- Modify: `artifacts/coffee-water-calculator/src/App.tsx`
- Test: `artifacts/coffee-water-calculator/e2e/salt-units-explainer.spec.ts`

**Interfaces:**
- Consumes: `SaltUnitsBreakdown` from `saltUnitsExplainer.ts`, plus current salt targets, selected hydration-form indices, and recipe liters from `App.tsx`.
- Produces: an on-demand four-step dialog with Back, Next, and Close controls, attached to the existing Brewer/Alchemist salt-summary header.

- [ ] **Step 1: Write the failing browser test**

Verify the How it works control is available in Brewer and Alchemist summaries but absent in Watermancer; opening it shows the first step, Next/Back changes steps, and Close returns focus to the trigger without changing the summary. Verify keyboard operation and the current step is announced. Change a salt amount, selected form, or brew volume while the guide is open and confirm displayed values update; switching away from and back to the recipe modes must not show stale values.

- [ ] **Step 2: Run the browser test and confirm it fails**

Run: `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts e2e/salt-units-explainer.spec.ts`
Expected: FAIL because the explainer trigger and dialog do not exist.

- [ ] **Step 3: Build the display-only illustrated dialog**

Show the four approved concepts: salt target vs physical mass; salt-to-ion composition; mg vs mg/L (approximately ppm in dilute water); and GH/KH/TDS distinctions with live per-salt contributions. Use the current selected hydration forms and batch volume. Include a clear empty state when the breakdown is unavailable. Keep the dialog on-request, accessible, responsive, and visually consistent with the approved illustrated tours.

- [ ] **Step 4: Connect the dialog to the summary**

Derive the breakdown from the current recipe state and place the control in the existing Brewer/Alchemist summary header. Do not mount it in Watermancer and do not mutate recipe state from the guide.

- [ ] **Step 5: Run the browser test and confirm it passes**

Run: `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts e2e/salt-units-explainer.spec.ts`
Expected: PASS for mode visibility, live values, keyboard navigation, announcements, focus return, step navigation, closing, and unchanged recipe state.

- [ ] **Step 6: Run the complete verification set**

Run:
- `pnpm --filter @workspace/coffee-water-calculator run test`
- `pnpm --filter @workspace/coffee-water-calculator run typecheck`
- `pnpm --filter @workspace/coffee-water-calculator run build`
- `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts e2e/salt-units-explainer.spec.ts`

Expected: all commands pass. If browser verification requires the preview workflow, restart it once after implementation and inspect its logs before reporting.

- [ ] **Step 7: Commit the explainer**

Commit the dialog, App integration, and browser test together after the complete verification set passes.
