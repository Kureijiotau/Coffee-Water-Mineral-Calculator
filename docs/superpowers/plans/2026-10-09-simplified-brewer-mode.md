# Simplified Brewer Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Brewer calculator tab that shares Alchemist's salt recipe while using salt-only readings and a GH/KH-grouped table.

**Architecture:** Keep the active calculator mode separate from legacy `NerdLevel` state so old Brewer metadata cannot activate the new UI. Add a pure salt-grouping helper, extend saved-plan snapshots with an optional modern mode field, then wire the mode into `App.tsx` and browser tests.

**Tech Stack:** React, TypeScript, Vite, Vitest, Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-09-simplified-brewer-mode-design.md`

## Global Constraints

- Show calculator modes in this order: **Brewer**, **Alchemist**, **Watermancer**.
- Keep Alchemist as the existing default for users who have not explicitly selected a mode. Brewer becomes active only after the user selects it.
- Brewer and Alchemist share the active saved/custom recipe, salt targets, hydration forms, batch volume, recipe catalog, and concentrate recipe state.
- Do not clear or edit Alchemist mineral-water entries when switching to Brewer; exclude them from Brewer results and outputs.
- Each salt appears once in the Brewer table; retain the final section name **Additional ions**, not “Other salts.”
- Keep the legacy flavor-derived Brewer calculations and interface inactive.

## Review Focus

1. Missing, invalid, or unavailable mode storage falls back to the existing Alchemist/Watermancer behavior — test in `profiles.test.ts`.
2. Legacy `NerdLevel: 'brewer'` without the modern mode field does not activate the new Brewer tab — test in `profiles.test.ts` and `waterPlans.test.ts`.
3. A future salt contributing to both GH and KH appears once in GH and retains both contribution markers — test in `brewerSaltGroups.test.ts`.
4. Nonzero Alchemist source-water entries are ignored by Brewer but remain intact when switching back, and are absent from Brewer exports — test in `brewer-mode.spec.ts`.
5. Three mode buttons and grouped salt controls remain usable on a narrow viewport — test in `brewer-mode.spec.ts`.

---

### Task 1: Persist the calculator tab separately from legacy NerdLevel

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/profiles.ts`
- Test: `artifacts/coffee-water-calculator/src/profiles.test.ts`

**Interfaces:**
- Produces `CalculatorMode = 'brewer' | 'alchemist' | 'watermancer'`.
- Produces `loadCalculatorMode(): CalculatorMode` and `saveCalculatorMode(mode: CalculatorMode): void`.
- Keep `NerdLevel`, `loadNerdLevel()`, and `saveNerdLevel()` compatible with existing consumers.

- [ ] **Step 1: Write failing mode-preference tests**

Test explicit round-trips for all three modes. With no new mode key, expect the legacy Watermancer preference to remain Watermancer and missing, invalid, or legacy Brewer preference to fall back to Alchemist.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm --filter @workspace/coffee-water-calculator test -- src/profiles.test.ts`
Expected: FAIL because `loadCalculatorMode` and `saveCalculatorMode` do not exist.

- [ ] **Step 3: Implement the calculator-mode preference**

Add the `cwm.calculatorMode` key and exported type/functions in `profiles.ts`. A valid new key wins; otherwise map legacy Watermancer to Watermancer and every other legacy value to Alchemist. Storage exceptions also fall back to Alchemist.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `pnpm --filter @workspace/coffee-water-calculator test -- src/profiles.test.ts`
Expected: PASS, including the existing `loadNerdLevel()` compatibility tests.

- [ ] **Step 5: Commit**

```bash
git add artifacts/coffee-water-calculator/src/profiles.ts artifacts/coffee-water-calculator/src/profiles.test.ts
git commit -m "feat: persist calculator mode separately"
```

### Task 2: Preserve calculator mode in saved Water Plan snapshots

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/waterPlans.ts`
- Test: `artifacts/coffee-water-calculator/src/waterPlans.test.ts`

**Interfaces:**
- Consumes `CalculatorMode` from `profiles.ts`.
- Produces optional `WaterPlanSnapshot.calculatorMode?: CalculatorMode`; keep plan file version `1`.
- Produces `resolveWaterPlanCalculatorMode(snapshot: Pick<WaterPlanSnapshot, 'calculatorMode' | 'nerdLevel'>): CalculatorMode`; use the explicit field when present, otherwise map only legacy Watermancer to Watermancer and all other legacy values to Alchemist.

- [ ] **Step 1: Write failing snapshot compatibility tests**

Assert that an explicit Brewer mode round-trips through serialized plans, an invalid modern mode is rejected, and a legacy snapshot without `calculatorMode` remains valid even when `nerdLevel` is `'brewer'`. Assert the resolver returns Alchemist for that legacy snapshot and honors each valid explicit mode.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm --filter @workspace/coffee-water-calculator test -- src/waterPlans.test.ts`
Expected: FAIL because snapshots do not yet accept the modern mode field.

- [ ] **Step 3: Add the optional mode field and validation**

Add `calculatorMode?: CalculatorMode` to `WaterPlanSnapshot`; accept only the three valid values when present. Preserve existing v1 snapshots that omit the field. Implement `resolveWaterPlanCalculatorMode` with the compatibility mapping in the interface above.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `pnpm --filter @workspace/coffee-water-calculator test -- src/waterPlans.test.ts`
Expected: PASS, including existing legacy snapshot tests.

- [ ] **Step 5: Commit**

```bash
git add artifacts/coffee-water-calculator/src/waterPlans.ts artifacts/coffee-water-calculator/src/waterPlans.test.ts
git commit -m "feat: persist calculator mode in water plans"
```

### Task 3: Add a pure GH/KH salt-grouping helper

**Files:**
- Create: `artifacts/coffee-water-calculator/src/brewerSaltGroups.ts`
- Test: `artifacts/coffee-water-calculator/src/brewerSaltGroups.test.ts`

**Interfaces:**
- Consumes `SaltInfo` and ordered `{ salt: SaltInfo; index: number }` rows from `waterData.ts`.
- Produces:
  - `BrewerSaltGroupId = 'gh' | 'kh' | 'additional'`
  - `BrewerSaltRow = { salt: SaltInfo; index: number; contributesToGh: boolean; contributesToKh: boolean }`
  - `BrewerSaltGroup = { id: BrewerSaltGroupId; label: 'GH contributors' | 'KH contributors' | 'Additional ions'; rows: BrewerSaltRow[] }`
  - `buildBrewerSaltGroups(rows: readonly { salt: SaltInfo; index: number }[]): BrewerSaltGroup[]`

- [ ] **Step 1: Write failing grouping tests**

Use `SALTS` and `WATERMANCER_SALT_ORDER` to assert all salts appear once, in GH → KH → Additional ions order, with original order preserved within each group and row indexes unchanged. Include a synthetic dual-contributor salt; it must appear once in GH with both contribution flags set.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm --filter @workspace/coffee-water-calculator test -- src/brewerSaltGroups.test.ts`
Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement `buildBrewerSaltGroups`**

Classify from modeled `salt.ions`: calcium/magnesium means GH; bicarbonate/carbonate without calcium/magnesium means KH; neither means Additional ions. Assign dual contributors to GH and retain both flags.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `pnpm --filter @workspace/coffee-water-calculator test -- src/brewerSaltGroups.test.ts`
Expected: PASS; every input row appears exactly once and retains its original index.

- [ ] **Step 5: Commit**

```bash
git add artifacts/coffee-water-calculator/src/brewerSaltGroups.ts artifacts/coffee-water-calculator/src/brewerSaltGroups.test.ts
git commit -m "feat: group Brewer salts by GH and KH"
```

### Task 4: Add Brewer as an explicit calculator mode

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/App.tsx`
- Create/modify: `artifacts/coffee-water-calculator/e2e/brewer-mode.spec.ts`

**Interfaces:**
- Consumes `CalculatorMode`, `loadCalculatorMode`, `saveCalculatorMode`, and the optional snapshot mode field from Tasks 1–2.
- The app keeps `nerdLevel` for legacy recipe/snapshot behavior; new Brewer selection maps that legacy state to Alchemist and never sets legacy `nerdLevel` to `'brewer'`.

- [ ] **Step 1: Write failing browser tests for mode selection and legacy behavior**

Assert the button order is Brewer → Alchemist → Watermancer; Alchemist remains the initial mode when no new preference exists; selecting Brewer survives refresh; and a stored legacy `'brewer'` value without `cwm.calculatorMode` opens Alchemist.

- [ ] **Step 2: Run the focused browser test and verify it fails**

Run: `pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/brewer-mode.spec.ts`
Expected: FAIL because the Brewer button and modern mode preference are absent.

- [ ] **Step 3: Add explicit mode state and tab controls in `App.tsx`**

Import `CalculatorMode`, `loadCalculatorMode`, and `saveCalculatorMode` from `profiles.ts`; remove App.tsx's local two-value `CalculatorMode` alias. Use `loadCalculatorMode` for state initialization and persist changes with `saveCalculatorMode`. Add `showBrewer`, `showAlchemist`, and `showWatermancer` derived from the modern mode. Render three buttons in the required order with `data-testid="mode-brewer"` and correct `aria-pressed` state.

- [ ] **Step 4: Keep mode transitions and recipe actions consistent**

When entering Brewer, retain shared recipe rows, volume, hydration forms, and concentrate settings; map legacy `nerdLevel` to Alchemist. Keep Watermancer cleanup when leaving Watermancer and existing concentrate reset behavior when entering Watermancer. Selecting an Alchemist-level salt recipe must not switch Brewer to Alchemist; any existing recipe/import action that routes to Watermancer must update both the modern mode and legacy mode.

- [ ] **Step 5: Add mode-aware plan capture and restoration**

Include `calculatorMode` in `captureWaterPlanSnapshot`; when the modern mode is Brewer, keep the legacy `nerdLevel` value as Alchemist. In `restoreWaterPlan`, set the modern mode using `resolveWaterPlanCalculatorMode`; update the legacy mode from the snapshot using the current compatibility mapping. Update the modern mode during recipe-file imports and plan restoration so the active tab matches the loaded workflow.

- [ ] **Step 6: Run the focused browser test and verify it passes**

Run: `pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/brewer-mode.spec.ts`
Expected: PASS for tab order, explicit preference persistence, and legacy mode fallback.

- [ ] **Step 7: Commit**

```bash
git add artifacts/coffee-water-calculator/src/App.tsx artifacts/coffee-water-calculator/e2e/brewer-mode.spec.ts
git commit -m "feat: add Brewer calculator mode"
```

### Task 5: Render Brewer's grouped salt-only recipe workspace

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/App.tsx`
- Test: `artifacts/coffee-water-calculator/e2e/brewer-mode.spec.ts`

**Interfaces:**
- Consumes `buildBrewerSaltGroups` from Task 3 and `showBrewer` / mode state from Task 4.
- Brewer and Alchemist use the same `rows`, recipe targets, and chemistry; only Brewer's presentation and water-source contribution differ.

- [ ] **Step 1: Add failing browser assertions for the Brewer view**

Assert the GH contributors, KH contributors, and Additional ions sections appear in order; salt rows use the indigo GH and amber KH background classes; the mineral-water panel, `IonWatchDisclosure`, and retired flavor-profile controls are absent; and recipe, batch-volume, concentrate, and GH/KH/TDS controls remain available.

- [ ] **Step 2: Run the focused browser test and verify it fails**

Run: `pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/brewer-mode.spec.ts`
Expected: FAIL because the grouped view and Brewer-specific visibility rules are absent.

- [ ] **Step 3: Render grouped rows without changing Alchemist ordering**

Build Brewer row groups from `mineralRecipeSaltRows` and retain each original row index for `safeRows` edits. Render section headings, indigo GH row backgrounds, amber KH row backgrounds, and neutral Additional ions rows only in Brewer. Keep Alchemist's current row order and colors.

- [ ] **Step 4: Separate shared recipe controls from Alchemist-only water controls**

Define `showRecipeMode = showBrewer || showAlchemist` and use it for the salt table, direct-dose inputs, batch volume, concentrate panels, GH/KH/TDS summary, and recipe steps. Keep mineral-water controls and `IonWatchDisclosure` guarded by Alchemist/Watermancer only. Add `data-testid="ion-watch-disclosure"` to the disclosure root for the absence/presence assertion.

- [ ] **Step 5: Enforce salt-only Brewer readings and exports**

Keep Alchemist water entries untouched, but ensure Brewer's live ions, GH/KH/TDS, concentrate guidance, and recipe steps ignore them. In `handleExportRecipe`, export Brewer's salt-only final ions and omit its `sourceWaters`; preserve Alchemist export behavior.

- [ ] **Step 6: Add browser coverage for shared edits, water preservation, and exports**

In `brewer-mode.spec.ts`, edit a salt target and batch volume in Brewer, switch to Alchemist and back, and verify values persist. Add a nonzero source-water entry in Alchemist, verify Brewer results and exported `.WATER` data are salt-only with no source-water entries, then switch back and verify the source-water panel and entry are intact. Also verify Alchemist retains its ion-watch disclosure and Watermancer retains its water/target controls. Reuse the download inspection pattern from `e2e/recipe-share-card.spec.ts`.

- [ ] **Step 7: Run the focused browser test and verify it passes**

Run: `pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/brewer-mode.spec.ts`
Expected: PASS at desktop and narrow/mobile viewport sizes.

- [ ] **Step 8: Commit**

```bash
git add artifacts/coffee-water-calculator/src/App.tsx artifacts/coffee-water-calculator/e2e/brewer-mode.spec.ts
git commit -m "feat: group Brewer salts and use salt-only readings"
```

### Task 6: Run full feature verification

**Files:**
- Verify: `artifacts/coffee-water-calculator/src/profiles.test.ts`
- Verify: `artifacts/coffee-water-calculator/src/waterPlans.test.ts`
- Verify: `artifacts/coffee-water-calculator/src/brewerSaltGroups.test.ts`
- Verify: `artifacts/coffee-water-calculator/e2e/brewer-mode.spec.ts`

**Interfaces:**
- Consumes the complete implementation from Tasks 1–5.

- [ ] **Step 1: Run all calculator unit tests**

Run: `pnpm --filter @workspace/coffee-water-calculator test`
Expected: PASS with no existing chemistry or persistence regressions.

- [ ] **Step 2: Run calculator typecheck and production build**

Run: `pnpm --filter @workspace/coffee-water-calculator run typecheck && pnpm --filter @workspace/coffee-water-calculator run build`
Expected: Both commands complete successfully.

- [ ] **Step 3: Run the Brewer browser regression suite**

Run: `pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/brewer-mode.spec.ts`
Expected: PASS for mode persistence, legacy-plan fallback, grouped rows, salt-only exports, retained Alchemist waters, and mobile layout.

