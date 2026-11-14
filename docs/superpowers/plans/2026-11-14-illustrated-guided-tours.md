# Illustrated Guided Tours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a distinct static illustration to every Brewer, Alchemist, and Concentrates tour step while leaving Watermancer and all workflow behavior unchanged.

**Architecture:** Expand the shared tour-step metadata with stable illustration keys, then use one renderer to dispatch each key to a calculator, Concentrates, or existing Watermancer diagram. The shared spotlight dialog owns the visual container and passes the same renderer into calculator and Concentrates tours; diagrams receive only their key and never read application data.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-14-illustrated-guided-tours-design.md`

## Global Constraints

- Add a distinct instructional diagram to every existing Brewer and Alchemist tour step.
- Add a distinct instructional diagram to every Concentrates tour step: recipe concentrate, Stock Builder, DIY Lotus Drops, and the empty recipe prompt.
- Keep the current Watermancer tour and its illustrations unchanged.
- Reuse the existing dimmed-page overlay, live-section spotlight, dialog, progress, and navigation controls.
- Preserve each tour's current step order, wording, triggers, persistence, and branch selection.
- Do not change chemistry, recipes, stock calculations, or calculator state.
- Do not change first-visit, replay, skip, finish, or keyboard behavior.

## Review Focus

- **A tour step is missing its visual key:** test every expected key in `calculatorGuidedTour.test.ts` and `concentrateGuidedTour.test.ts`.
- **A key is rendered by the wrong visual family:** exercise all calculator and Concentrates branches in Playwright and assert the visual key matches the spotlight target.
- **Watermancer changes accidentally during shared rendering:** retain its seven expected keys and assert the current visuals remain the same.
- **An empty or hidden Concentrates branch has no valid target:** exercise the empty recipe prompt and each branch; keep existing missing-target close behavior.
- **The illustrated dialog clips or obscures content on a phone:** check dialog and spotlight bounds while stepping through visually illustrated calculator and Concentrates tours at 375px width.

---

### Task 1: Extend typed tour metadata and the shared visual slot

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/guidedTour.ts`
- Modify: `artifacts/coffee-water-calculator/src/calculatorGuidedTour.ts`
- Modify: `artifacts/coffee-water-calculator/src/concentrateGuidedTour.ts`
- Modify: `artifacts/coffee-water-calculator/src/calculatorGuidedTour.test.ts`
- Modify: `artifacts/coffee-water-calculator/src/concentrateGuidedTour.test.ts`
- Modify: `artifacts/coffee-water-calculator/src/ConcentrateGuidedTour.tsx`
- Modify: `artifacts/coffee-water-calculator/src/WatermancerTourIllustration.tsx`

**Interfaces:**
- Consumes: the existing seven `WatermancerTourIllustrationKey` values and each tour's current step definitions.
- Produces: `CalculatorTourIllustrationKey` (ten calculator keys), `ConcentrateTourIllustrationKey` (16 Concentrates keys), `GuidedTourIllustrationKey = WatermancerTourIllustrationKey | CalculatorTourIllustrationKey | ConcentrateTourIllustrationKey`, `GuidedTourStep.illustrationKey?: GuidedTourIllustrationKey`, and a shared dialog visual slot whose wrapper exposes `data-testid="${testIdPrefix}-visual"` and `data-illustration-key={currentStep.illustrationKey}`.
- Calculator keys: `brewer-batch-volume`, `brewer-mineral-recipe`, `brewer-salt-summary`, `brewer-recipe-steps`, `alchemist-batch-volume`, `alchemist-mineral-water-base`, `alchemist-mineral-recipe`, `alchemist-ion-watch`, `alchemist-salt-summary`, `alchemist-recipe-steps`.
- Concentrates keys: `recipe-concentrate-empty`, `recipe-concentrate-overview`, `recipe-stock-arrangement`, `recipe-stock-weight`, `recipe-dose-result`, `recipe-preparation`, `stock-builder-mineral`, `stock-builder-calibration`, `stock-builder-setup`, `stock-builder-dose`, `stock-builder-preparation`, `lotus-dropper`, `lotus-calibration`, `lotus-volume`, `lotus-per-drop`, `lotus-stock-preparation`.

- [ ] **Step 1: Add failing tour metadata tests.** Assert the exact existing target order and the corresponding illustration key for every Brewer, Alchemist, and Watermancer stop. In the Concentrates tests, assert the exact key order for recipe, Stock Builder, Lotus, and empty recipe branches; the Lotus and Stock Builder calibration steps must have separate keys.
- [ ] **Step 2: Run the focused unit tests and confirm the new key assertions fail.** Run `pnpm --filter @workspace/coffee-water-calculator run test -- src/calculatorGuidedTour.test.ts src/concentrateGuidedTour.test.ts`. Expected: the missing shared key type and tour metadata cause the new assertions to fail.
- [ ] **Step 3: Define the shared illustration-key union.** In `guidedTour.ts`, export `GuidedTourIllustrationKey`, retain `WatermancerTourIllustrationKey` as the Watermancer-only subset, and type the optional step field with the shared union.
- [ ] **Step 4: Assign keys without changing tour copy or order.** Add one unique key to each of the 26 non-Watermancer steps in `calculatorGuidedTour.ts` and `concentrateGuidedTour.ts`; preserve all seven existing Watermancer keys and the empty recipe action.
- [ ] **Step 5: Put stable visual metadata on the shared dialog slot.** In `ConcentrateGuidedTour.tsx`, wrap rendered visuals with the prefix-specific test ID and current key. Move the existing Watermancer wrapper/test attributes to this common slot so its visible diagram content and test contract remain unchanged.
- [ ] **Step 6: Run the focused unit tests and confirm metadata coverage passes.** Expected: all existing target order and new per-step key assertions pass.

### Task 2: Build and wire calculator-mode illustrations

**Files:**
- Create: `artifacts/coffee-water-calculator/src/CalculatorTourIllustration.tsx`
- Create: `artifacts/coffee-water-calculator/src/GuidedTourIllustration.tsx`
- Modify: `artifacts/coffee-water-calculator/src/App.tsx`
- Modify: `artifacts/coffee-water-calculator/src/calculatorGuidedTour.test.ts`
- Modify: `artifacts/coffee-water-calculator/e2e/calculator-mode-guided-tour.spec.ts`

**Interfaces:**
- Consumes: `GuidedTourIllustrationKey`, the shared dialog visual slot, and `WatermancerTourIllustration`.
- Produces: `CalculatorTourIllustration({ illustrationKey }: { illustrationKey: CalculatorTourIllustrationKey })` for the ten Brewer/Alchemist keys and `GuidedTourIllustration({ illustrationKey }: { illustrationKey: GuidedTourIllustrationKey })`, which dispatches Watermancer and calculator keys while returning `null` for Concentrates keys until Task 3 adds that renderer.
- Calculator diagrams are static. Their input is only `illustrationKey`; they do not read the current recipe, targets, or calculations.

- [ ] **Step 1: Add failing browser assertions for calculator illustrations.** Update the existing calculator tour E2E to expect a visual key at every Brewer and Alchemist stop, while retaining the Watermancer’s current seven keys and target sequence.
- [ ] **Step 2: Run the calculator guided-tour browser test to confirm it fails.** Run `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts e2e/calculator-mode-guided-tour.spec.ts`. Expected: Brewer and Alchemist have no visual yet.
- [ ] **Step 3: Implement ten calculator diagrams.** Add a compact static visual for each key: volume-to-dose flow, recipe controls, summary metrics, recipe preparation, optional source-water contribution, ion-range check, and salt-only summary. Keep labels complementary to the existing text and use the current dark/cyan visual treatment.
- [ ] **Step 4: Implement the shared dispatcher and enable it for every calculator mode.** Dispatch Watermancer keys to the existing Watermancer visuals and Brewer/Alchemist keys to `CalculatorTourIllustration`; return `null` for Concentrates-only keys. In `App.tsx`, provide the renderer for all calculator tour modes rather than Watermancer alone.
- [ ] **Step 5: Re-run the calculator tour E2E.** Expected: the spotlight target and diagram key update together for every step, with all current tour behaviors unchanged.

### Task 3: Build and wire Concentrates illustrations

**Files:**
- Create: `artifacts/coffee-water-calculator/src/ConcentrateTourIllustration.tsx`
- Modify: `artifacts/coffee-water-calculator/src/GuidedTourIllustration.tsx`
- Modify: `artifacts/coffee-water-calculator/src/MassConcentrateWorkspace.tsx`
- Modify: `artifacts/coffee-water-calculator/e2e/concentrate-guided-tour.spec.ts`

**Interfaces:**
- Consumes: the 16 Concentrates illustration keys and the shared `GuidedTourIllustration` dispatcher.
- Produces: `ConcentrateTourIllustration({ illustrationKey }: { illustrationKey: ConcentrateTourIllustrationKey })` for recipe, Stock Builder, Lotus, and empty-recipe keys; the dispatcher returns this component for all Concentrates keys.
- Both Concentrates tour render sites pass their current step key through `GuidedTourIllustration`, using the `concentrate-guided-tour` test prefix.

- [ ] **Step 1: Add failing branch coverage assertions.** Update the Concentrates tour E2E to verify a distinct illustration key at all recipe, Stock Builder, Lotus, and empty-state stops, including both calibration visuals.
- [ ] **Step 2: Run the Concentrates guided-tour E2E to confirm it fails.** Run `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts e2e/concentrate-guided-tour.spec.ts`. Expected: the Concentrates visual slot and branch diagrams are absent.
- [ ] **Step 3: Implement sixteen compact Concentrates diagrams.** Represent stock arrangement and finished mass, mineral/hydration choice, tip calibration, dose and brew volume, preparation, per-drop comparison, and the route back to Calculator. Keep Lotus and Stock Builder calibration diagrams distinct, even though they spotlight the shared calibration fields.
- [ ] **Step 4: Extend the dispatcher and wire both Concentrates tour render sites.** In `GuidedTourIllustration.tsx`, dispatch all Concentrates keys to the new component. In `MassConcentrateWorkspace.tsx`, pass the shared dispatcher to both the empty-recipe and regular-workspace tour instances.
- [ ] **Step 5: Re-run the Concentrates tour E2E.** Expected: each branch and empty-state step shows the correct key and spotlight; navigation, branch selection, and current form values remain unchanged.

### Task 4: Verify all tours together

**Files:**
- Modify: `artifacts/coffee-water-calculator/e2e/calculator-mode-guided-tour.spec.ts`
- Modify: `artifacts/coffee-water-calculator/e2e/concentrate-guided-tour.spec.ts`
- Test: `artifacts/coffee-water-calculator/src/calculatorGuidedTour.test.ts`
- Test: `artifacts/coffee-water-calculator/src/concentrateGuidedTour.test.ts`

**Interfaces:**
- Consumes: all 33 typed illustration keys, the shared tour renderer, and the current tour persistence/navigation behavior.
- Produces: browser and unit coverage proving complete illustration coverage and unchanged tour flows.

- [ ] **Step 1: Add responsive illustrated-tour checks.** At 375px viewport width, step through Brewer, Alchemist, and one representative Concentrates branch; assert the dialog and live target stay within the viewport and do not overlap.
- [ ] **Step 2: Re-run all tour unit and browser tests.** Run `pnpm --filter @workspace/coffee-water-calculator run test -- src/calculatorGuidedTour.test.ts src/concentrateGuidedTour.test.ts` and `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts e2e/calculator-mode-guided-tour.spec.ts e2e/concentrate-guided-tour.spec.ts`.
- [ ] **Step 3: Run package typecheck and build.** Run `pnpm --filter @workspace/coffee-water-calculator run typecheck` and `pnpm --filter @workspace/coffee-water-calculator run build`; expected: both exit successfully.
- [ ] **Step 4: Review representative visuals.** Inspect first, middle, and final steps in each mode/branch on desktop and phone; confirm no live values leak into diagrams, text is not duplicated, the active section remains identifiable, and Watermancer remains visually unchanged.
