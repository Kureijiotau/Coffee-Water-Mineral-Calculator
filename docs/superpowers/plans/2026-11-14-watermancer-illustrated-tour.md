# Watermancer Illustrated Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add concise, step-specific visual explanations to all seven Watermancer tour stops while keeping the live spotlight, navigation, and calculation behavior intact.

**Architecture:** Add a typed illustration key to tour-step data and render the corresponding static diagram through an optional visual-renderer prop on the existing shared tour dialog. Enable that prop only for Watermancer, keeping the other modes on their current presentation; adapt the illustrated dialog placement to remain near, but not obscure, its live spotlight.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-14-watermancer-illustrated-tour-design.md`

## Global Constraints

- Keep the current live-page dimming and spotlight on the step's real Watermancer section.
- Apply the illustrated treatment to all seven Watermancer tour steps.
- Changes to Brewer, Alchemist, Concentrates, or their tours are not included.
- Changes to salt selection, ion targets, matching, recipes, or calculation code are not included.
- External illustrations, product artwork, or new image assets are not included.
- Preserve the existing first-visit behavior and replay shortcut for Watermancer.

## Review Focus

- **Illustrative values could be mistaken for live data:** in `renders_static_illustration_for_the_current_step`, assert the illustration is selected only by its key and contains no values read from app state.
- **A conditional or hidden target may not exist:** in `closes_without_marking_seen_when_current_target_disappears`, remove the current target, confirm the tour closes, reload, and confirm first-visit launch remains available.
- **A narrow or short viewport may clip the target or guide:** in `keeps_spotlight_and_dialog_in_view_on_mobile`, verify both bounding boxes remain within the viewport and the target is not obscured.
- **Browser storage may be unavailable:** in `handles_unavailable_local_storage`, make reads and writes throw and verify tour state helpers do not throw or prevent manual opening.
- **Keyboard and reduced-motion users may lose access or context:** in `supports_keyboard_navigation_and_reduced_motion`, verify Escape closes, focus returns to the trigger, current-step copy updates, and the illustration suppresses nonessential motion.

---

### Task 1: Add the illustrated Watermancer tour

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/guidedTour.ts`
- Modify: `artifacts/coffee-water-calculator/src/calculatorGuidedTour.ts`
- Modify: `artifacts/coffee-water-calculator/src/calculatorGuidedTour.test.ts`
- Create: `artifacts/coffee-water-calculator/src/WatermancerTourIllustration.tsx`
- Modify: `artifacts/coffee-water-calculator/src/ConcentrateGuidedTour.tsx`
- Modify: `artifacts/coffee-water-calculator/src/App.tsx`
- Modify: `artifacts/coffee-water-calculator/e2e/calculator-mode-guided-tour.spec.ts`

**Interfaces:**
- Consumes: `GuidedTourStep` fields `targetTestId`, `title`, and `description`; the current `ConcentrateGuidedTour` spotlight and navigation behavior.
- Produces: `WatermancerTourIllustration({ illustrationKey }: { illustrationKey: WatermancerTourIllustrationKey })`; an optional `renderStepVisual?: (step: ConcentrateTourStep) => ReactNode` prop; and an optional typed `illustrationKey` on guided-tour steps.

- [ ] **Step 1: Add failing tour-data assertions.** In `calculatorGuidedTour.test.ts`, add `maps_all_seven_watermancer_steps_to_distinct_illustrations` to assert the seven target IDs remain in order and map respectively to `ion-targets`, `batch-volume`, `source-waters`, `salts`, `auto-match`, `final-mixture`, and `recipe-steps`; assert Brewer and Alchemist steps have no illustration key.
- [ ] **Step 2: Run the focused unit test and confirm it fails.** Run `pnpm --filter @workspace/coffee-water-calculator run test -- src/calculatorGuidedTour.test.ts`. Expected: the missing illustration-key assertions fail before implementation.
- [ ] **Step 3: Add typed illustration metadata to the seven Watermancer steps.** Define the seven-key union in `guidedTour.ts`, add optional `illustrationKey` to `GuidedTourStep`, and set exactly one key on each Watermancer step without changing other mode data or copy.
- [ ] **Step 4: Create the seven static diagrams.** Implement `WatermancerTourIllustration.tsx` with one compact diagram per key, built from existing icon/UI primitives and the app palette. Accept only `illustrationKey` as input, so diagrams cannot read calculator state; label any example values.
- [ ] **Step 5: Add an optional visual slot to the shared tour dialog.** Add `renderStepVisual` to `ConcentrateGuidedTour`; when present, render the diagram beside its explanation and use a responsive card capped at 560px on desktop. Choose the side with more available room and clamp the card to the viewport; retain the existing layout when the prop is absent.
- [ ] **Step 6: Enable the visual slot only for Watermancer.** In `App.tsx`, pass a renderer only when `calculatorTourMode === 'watermancer'`, using the current step's `illustrationKey`. Keep the spotlight and tour trigger/persistence paths unchanged.
- [ ] **Step 7: Add browser assertions for changing illustrations and spotlights.** In `calculator-mode-guided-tour.spec.ts`, assert each Next action updates the visual key and spotlight target together, all seven steps are reached, and Brewer/Alchemist render no illustration.
- [ ] **Step 8: Cover narrow viewports and resilience.** Add the five Review Focus tests: mobile spotlight/dialog bounds, safe close and replay after target removal, unavailable storage, keyboard navigation/focus restoration, and reduced-motion styling. Mark a diagram `aria-hidden` only when the neighboring explanation conveys the same information.
- [ ] **Step 9: Run focused and full verification.** Run the guided-tour Vitest file, the calculator Playwright tour spec, the calculator typecheck, and the calculator build. Expected: each command exits successfully and the seven Watermancer tour steps render without changing other tours.
- [ ] **Step 10: Review the finished tour visually.** Inspect all seven steps at desktop and phone widths; verify the live section remains highlighted, examples are not presented as actual user values, and the card does not cover or clip the active target.
