# Editable Recipe-Concentrate Dose Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `.agents/skills/executing-plans` to implement this plan task-by-task.

**Goal:** Let users edit the total stock grams for their selected brew-water amount while preserving recipe targets and warning when the implied stock strength is above the existing modeled safe recommendation.

**Architecture:** Reuse the tested inverse of the current mass-dose equation in `concentrateMass.ts`. In recipe mode, show the total stock grams as the editable value in the inline result sentence and derive g/L from that amount and the selected brew-water mass. Derive its conservative safe alternative from the current mass-concentrate safety model. Keep DIY and Lotus-only cards unchanged.

**Tech Stack:** TypeScript, React, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-10-recipe-concentrate-dose-control-design.md`

## Global Constraints

- Keep concentrate preparation and stock weight mass-based; do not add volume-based concentrate math.
- Keep total finished stock mass separate from the selected total grams for the current brew.
- A valid dose edit recalculates stock strength while preserving recipe targets.
- Changing stock weight retains the selected dose in grams for the current brew and recalculates strength unless an existing per-drop pin is active.
- If the entered dose implies an unsafe strength, show the warning and safer grams-per-liter value without silently changing the user's entry.
- Do not change DIY single-salt or Lotus-specific workflows.
- The safety result is a modeled estimate, not a laboratory guarantee.

## Review Focus

1. Blank, zero, negative, NaN, or infinite doses must not update stock strength. Cover in `concentrateMass.test.ts` and the dose field browser test.
2. A stock mass / g-per-liter combination must invert the existing dose equation exactly. Cover 100 g stock at 10 g/L → ×10 strength in unit and browser tests.
3. Changing brew-water mass must scale the editable total-grams amount without changing stock strength. Cover in the browser test.
4. An over-limit strength must show its warning and safe higher-g/L recommendation even though existing blocked-result UI hides ordinary dose details. Cover in the browser test.
5. Existing per-drop pins must be cleared when the user explicitly sets a recipe dose. Cover with the dose-edit browser test and persistence assertion.

---

### Task 1: Add the inverse recipe-dose calculation and UI

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/concentrateMass.ts`
- Test: `artifacts/coffee-water-calculator/src/concentrateMass.test.ts`
- Modify: `artifacts/coffee-water-calculator/src/MassConcentrateWorkspace.tsx`
- Test: `artifacts/coffee-water-calculator/e2e/concentrate-mass-workflow.spec.ts`

**Interfaces:**
- Add `computeRecipeMassStrengthForDose(input: { totalStockMassG: number; doseGramsPerLiter: number }): { valid: true; strength: number } | { valid: false; reason: string }`.
- For valid positive finite inputs, derive `doseGramsPerLiter = enteredDoseMassG / finalWaterMassKg`, then calculate `strength = totalStockMassG / doseGramsPerLiter`.
- Add an `editableRecipeDose` prop to `MassStockCard`, true only for recipe-concentrate mode.

- [ ] **Step 1: Write failing unit tests** for 100 g at 10 g/L yielding ×10, invalid/nonpositive values being rejected, and the existing dose calculation reproducing 10 g/L for 100 g stock at ×10.
- [ ] **Step 2: Run the focused unit test** with `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/concentrateMass.test.ts`; confirm it fails because the inverse helper is missing.
- [ ] **Step 3: Implement the inverse helper** in `concentrateMass.ts` with finite-positive validation and a clear invalid result.
- [ ] **Step 4: Run the focused unit test** and confirm all mass calculation tests pass.
- [ ] **Step 5: Write failing browser tests** that verify the inline stock-grams field starts from current strength, editing 5 to 10 g for 1 L changes the recipe strength to ×10 and preparation/dose outputs, brew-water changes scale the entered total dose, and an unsafe dose shows the conservative safe recommendation. Verify DIY and Lotus views do not gain this field.
- [ ] **Step 6: Run the focused browser test** with `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts --project=chromium --workers=1 e2e/concentrate-mass-workflow.spec.ts`; confirm the new assertions fail before implementation.
- [ ] **Step 7: Implement the recipe-only dose input** in the non-DIY branch of `MassStockCard`, inline in the “Dose [amount] g stock for [volume] L brewing water” sentence. Initialize total dose grams from the current stock mass, strength, and brew-water mass; on valid edits derive g/L and update strength, reset batch scaling, and clear conflicting per-drop pins. When stock mass changes with no pin active, retain total grams for the current brew and recalculate strength. Preserve existing per-drop-pin behavior until the dose input is explicitly edited. Leave invalid drafts unapplied.
- [ ] **Step 8: Add the safety warning and recommendation** outside the blocked-result-only branch. When current strength exceeds `recommendedStrength`, show the maximum conservative strength, the corresponding safe g/L, and that amount multiplied by the current brew-water mass. If no recommendation is available for the setup, say so without inventing a dose.
- [ ] **Step 9: Run the focused browser test** and confirm normal edits, safety guidance, and unchanged DIY/Lotus paths pass.
- [ ] **Step 10: Run full verification**: calculator unit tests, typecheck, production build, `check:unused-live`, and the focused browser test. Restart the configured calculator web workflow once and check that it serves cleanly.
