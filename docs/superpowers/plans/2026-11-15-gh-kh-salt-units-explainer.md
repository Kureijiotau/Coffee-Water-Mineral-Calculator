# GH/KH and Salt Units Explainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an illustrated static explainer that clarifies salt-to-ion contributions, GH, KH, and mg/mg-L/ppm without changing recipe calculations.

**Architecture:** Render rounded, fixed chemistry examples in the existing on-demand dialog attached to the Brewer/Alchemist salt summary. Reuse the app's ion and salt colors; do not connect guide values to recipe state or alter the chemistry engine.

**Tech Stack:** React, TypeScript, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-15-gh-kh-salt-units-explainer-design.md`

## Global Constraints

- The explainer appears only in the existing Brewer and Alchemist recipe-summary card; it does not add a Watermancer control.
- Salt-row targets are anhydrous-equivalent concentration in ppm (approximately mg/L in dilute water); direct dose is physical mass to weigh.
- GH is derived from calcium and magnesium; KH is derived from bicarbonate and carbonate, expressed as ppm CaCO₃-equivalent.
- Chloride and sulfate do not contribute to GH or KH.
- Display six fixed salt examples with rounded ion concentrations.
- Explain GH as Ca/Mg and KH as bicarbonate/carbonate, both as CaCO₃ equivalents.
- Explain mg as mass, mg/L as concentration, and ppm as approximately mg/L for dilute water.
- The examples never depend on selected recipe, hydration form, or brew volume.
- No existing recipe or solver result changes.

## Review Focus

- No active salts or a nonpositive/non-finite volume must show an empty-state explanation rather than stale results; pin this in the breakdown-helper tests.
- Changing hydration form must change physical weighed mass without changing the target ion profile; pin this in the breakdown-helper tests.
- Changing batch volume must scale weighed salt mass while preserving concentration-derived GH/KH; pin this in the breakdown-helper tests.
- Salts with chloride/sulfate, bicarbonate/carbonate, and calcium/magnesium must be attributed only to the correct GH/KH values; pin this in the breakdown-helper tests.
- Switching recipes or calculator modes while the dialog is open must not preserve stale contribution data; pin this in the browser test.

---

### Add the Static Illustrated Explainer

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/SaltUnitsExplainer.tsx`
- Modify: `artifacts/coffee-water-calculator/src/App.tsx`
- Test: `artifacts/coffee-water-calculator/e2e/salt-units-explainer.spec.ts`

**Interfaces:**
- Consumes: the app's existing `SALTS`, `IONS`, and color-token helpers.
- Produces: an on-demand three-step static dialog with Back, Next, and Close controls, attached to the existing Brewer/Alchemist salt-summary header.

- [ ] **Step 1: Write the failing browser test**

Verify the How it works control is available in Brewer and Alchemist summaries but absent in Watermancer; opening it shows fixed rounded examples with app ion colors, Next/Back changes steps, and Close returns focus to the trigger without changing the recipe. Change a salt amount, selected form, brew volume, and selected recipe; confirm guide examples remain unchanged.

- [ ] **Step 2: Run the browser test and confirm it fails**

Run: `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts e2e/salt-units-explainer.spec.ts`
Expected: FAIL because the current guide is dynamic and has four steps.

- [ ] **Step 3: Build the display-only illustrated dialog**

Show three concepts: six rounded salt-to-ion examples; GH/KH ion groups and examples; and unit definitions. Use static explanatory numbers, app ion colors, and a concise note about hydration water. Keep the dialog on-request, accessible, responsive, and visually consistent with the approved illustrated tours.

- [ ] **Step 4: Connect the dialog to the summary**

Keep the control in the existing Brewer/Alchemist summary header. Remove obsolete recipe-derived guide calculations, but do not change recipe calculations or mount the guide in Watermancer.

- [ ] **Step 5: Run the browser test and confirm it passes**

Run: `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts e2e/salt-units-explainer.spec.ts`
Expected: PASS for mode visibility, static values, ion colors, keyboard navigation, announcements, focus return, step navigation, closing, responsive layout, and unchanged recipe state across input changes.

- [ ] **Step 6: Run the complete verification set**

Run:
- `pnpm --filter @workspace/coffee-water-calculator run test`
- `pnpm --filter @workspace/coffee-water-calculator run typecheck`
- `pnpm --filter @workspace/coffee-water-calculator run build`
- `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts e2e/salt-units-explainer.spec.ts`

Expected: all commands pass. If browser verification requires the preview workflow, restart it once after implementation and inspect its logs before reporting.

- [ ] **Step 7: Commit the explainer**

Commit the dialog, App integration, and browser test together after the complete verification set passes.
