# Concentrates Guided Tour Implementation Plan

> **For agentic workers:** Use the `subagent-driven-development` or `executing-plans` skill to implement this plan task-by-task.

**Goal:** Add an accessible, branch-aware guided tour that helps users understand the Concentrates tab without changing any recipe data or calculations.

**Architecture:** Keep the walkthrough copy and branch selection in a small pure TypeScript module, and render the spotlight, dialog, and step controls in a focused React component. Integrate it inside `MassConcentrateWorkspace`, persist first-visit dismissal/completion locally, and use a callback from `App.tsx` only for the no-recipe path back to Calculator.

**Tech Stack:** React, TypeScript, Tailwind utility classes, Vitest, Playwright; no new dependencies or AI/API calls.

**Spec:** `docs/superpowers/specs/2026-11-12-concentrates-guided-tour-design.md`

## Global Constraints

- “The walkthrough is explanatory and navigational only. It does not write to fields, change recipes, or run or alter chemistry calculations.”
- “The walkthrough uses no AI.”
- “The tour follows the branch already open. It does not switch a user between these modes or highlight hidden controls.”
- “Remember that a user has skipped or finished the automatic tour in browser-local storage. Do not sync or store tour history on the server.”
- “If any other expected target is missing, close the overlay safely and leave the page usable.”
- “Respect reduced-motion preferences and avoid relying on color alone to identify the highlighted area.”
- “Do not modify the calculator, Watermancer, or Mixer experiences.”

## Review Focus

- **Recipe workspace without a handoff:** show a Calculator explanation and navigation action; cover with a branch-definition unit test and browser test.
- **Conditionally hidden or missing spotlight target:** close safely without breaking the workspace; cover with overlay behavior tests.
- **First-visit and replay state:** auto-open once, remember Skip/Finish locally, and allow manual replay; cover with browser storage tests.
- **Scrolling, resizing, and mobile viewport:** keep the target and dialog in view without covering the highlighted control; cover with desktop and narrow-viewport browser tests.
- **Current recipe/calibration values:** remain unchanged after advancing, skipping, and finishing; compare values before and after in a browser test.

---

### Task 1: Build and Integrate the Concentrates Tour

**Files:**
- Create: `artifacts/coffee-water-calculator/src/concentrateGuidedTour.ts`
- Test: `artifacts/coffee-water-calculator/src/concentrateGuidedTour.test.ts`
- Create: `artifacts/coffee-water-calculator/src/ConcentrateGuidedTour.tsx`
- Modify: `artifacts/coffee-water-calculator/src/MassConcentrateWorkspace.tsx`
- Modify: `artifacts/coffee-water-calculator/src/App.tsx`
- Test: `artifacts/coffee-water-calculator/e2e/concentrate-guided-tour.spec.ts`

**Interfaces:**
- `ConcentrateTourBranch`: `"recipe" | "stock-builder" | "lotus"`.
- `ConcentrateTourStep`: `{ targetTestId: string; title: string; description: string; action?: "calculator" }`.
- `getConcentrateTourSteps(branch: ConcentrateTourBranch, hasRecipeHandoff: boolean): ConcentrateTourStep[]` returns only steps valid for the currently displayed branch. With no recipe handoff, return a one-step Calculator explanation with the `calculator` action.
- `ConcentrateGuidedTour` accepts the selected `steps`, close and finish callbacks, and an optional Calculator-navigation callback. It owns the current step and spotlight positioning, but never writes workspace values.

- [x] **Step 1: Write failing unit tests** for the three branch-specific step lists and the no-recipe Calculator step. Assert each returned `targetTestId` belongs to its branch and that the no-recipe step carries the Calculator action.
- [x] **Step 2: Run the focused unit test and confirm it fails** because the tour-definition module does not exist yet.

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run src/concentrateGuidedTour.test.ts --config vitest.config.ts`

Expected: FAIL for the missing tour-definition module.

- [x] **Step 3: Implement the pure tour definitions** in `concentrateGuidedTour.ts`. Use the existing concentrate section test IDs where available and add stable targets only where needed.
- [x] **Step 4: Run the focused unit tests and confirm they pass.**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run src/concentrateGuidedTour.test.ts --config vitest.config.ts`

Expected: PASS for all branch and no-recipe cases.

- [x] **Step 5: Write failing browser tests** for Next, Back, Skip, Finish, Escape, progress text, focus restoration, missing targets, and narrow viewports. Assert the explanation does not obscure its target and workspace inputs are unchanged.
- [x] **Step 6: Run the browser tests and confirm they fail** because the tour overlay is not implemented.

Run: `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts e2e/concentrate-guided-tour.spec.ts`

Expected: FAIL because the tour control and overlay are not yet present.

- [x] **Step 7: Implement the spotlight tour component** with an accessible dialog, focus handling, Escape-to-Skip, progress, target scrolling, resize/scroll repositioning, reduced-motion support, and a responsive explanation card. If a target disappears, close safely.
- [x] **Step 8: Integrate the tour into `MassConcentrateWorkspace`** with first-visit auto-open and the replay control. Persist only local completion/dismissal state; derive the branch from current workspace mode and existing tool mode.
- [x] **Step 9: Wire the no-recipe Calculator action in `App.tsx`** through an explicit navigation callback. It may change the active tab only; it must not change the recipe, mode values, or calculations.
- [x] **Step 10: Run the new browser tests** for automatic opening, Skip/Finish persistence, replay, all three branches, missing-target handling, mobile layout, reduced motion, non-obscured targets, and unchanged recipe/calibration fields.

Run: `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts e2e/concentrate-guided-tour.spec.ts`

Expected: PASS for the new Concentrates tour scenarios on desktop and mobile-sized viewports.

- [x] **Step 11: Run the complete calculator test suite, typecheck, and production build.**

Run: `pnpm --filter @workspace/coffee-water-calculator run test && pnpm --filter @workspace/coffee-water-calculator run typecheck && pnpm --filter @workspace/coffee-water-calculator run build`

Expected: all tests pass, TypeScript reports no errors, and Vite builds successfully.
