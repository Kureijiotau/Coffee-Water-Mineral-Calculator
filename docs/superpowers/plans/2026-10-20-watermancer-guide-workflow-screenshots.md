# Watermancer Guide Workflow Screenshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Step 7’s tasting-recipe list with an accessible, responsive, screenshot-style walkthrough of the Watermancer workflow.

**Architecture:** Add one focused workflow component and a reusable screenshot frame, then mount them in the existing `make-and-taste` guide step. Update the step copy and retire the guide-only recipe list if no other imports remain. The illustrations are static and do not alter Watermancer behavior.

**Tech Stack:** React, TypeScript, Tailwind utility classes, Vitest, Vite. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-20-watermancer-guide-workflow-screenshots-design.md`

## Global Constraints

- Use grouped, static UI illustrations; actual screenshot capture is not reliable in the current environment.
- Show every requested action, in order, from recipe selection through saving a finished card.
- Use the real Watermancer labels and action semantics; mark sample values as examples.
- Keep current Watermancer behavior and the Strength scaler unchanged.
- Keep panels legible on mobile and provide an accessible description for each.
- Do not introduce real user or Community water data into examples.

## Review Focus

1. **An action is omitted:** test every requested feature label in the rendered workflow.
2. **Recipe reset is misrepresented:** verify its scope against the current Watermancer reset action and keep the caption exact.
3. **Community and personal waters are conflated:** test for separate examples of adding a Community water and sharing a personal water.
4. **Static controls look interactive:** test that panels expose image semantics and do not contain live buttons or inputs.
5. **Mobile panels clip long labels:** assert responsive layout classes and inspect the component structure for overflow-prone fixed widths.

---

### Task 1: Replace Step 7 recipes with the workflow walkthrough

**Files:**
- Create: `artifacts/coffee-water-calculator/src/WatermancerGuideScreenshotFrame.tsx`
- Create: `artifacts/coffee-water-calculator/src/WatermancerGuideWorkflow.tsx`
- Modify: `artifacts/coffee-water-calculator/src/WatermancerGuide.tsx`
- Modify: `artifacts/coffee-water-calculator/src/watermancerGuideContent.ts`
- Modify: `artifacts/coffee-water-calculator/src/WatermancerGuide.test.ts`
- Delete only if unused: `artifacts/coffee-water-calculator/src/WatermancerGuideRecipeCards.tsx`
- Delete only if unused: `artifacts/coffee-water-calculator/src/watermancerGuideRecipes.ts`

**Interfaces:**
- `WatermancerGuideScreenshotFrameProps` contains `title: string`, `description: string`, `testId: string`, and `children: ReactNode`.
- `WatermancerGuideScreenshotFrame(props: WatermancerGuideScreenshotFrameProps): React.JSX.Element` renders one static, accessible example panel.
- `WatermancerGuideWorkflow(): React.JSX.Element` renders the five ordered scenes and focused panels described in the approved spec.

- [ ] Inspect the live Watermancer source for exact action labels and reset scope before fixing screenshot copy.
- [ ] Add a failing test, `replaces the tasting recipes with the full Watermancer workflow`. Assert the five scene headings and every requested action: select/create/edit/download/import/reset recipes; set ion targets and batch volume; add a new water; find/use and share a Community water; enable/use salts; match targets; view and save a recipe card.
- [ ] Assert that the Reset caption matches the scope observed in the live Watermancer reset handler and makes no claims about data it does not change.
- [ ] Add assertions that old tasting recipe examples are absent, sample values are identified as examples, Community use and sharing are distinct, and each screenshot panel has accessible image semantics without live buttons or inputs.
- [ ] Assert the workflow uses responsive, shrinkable layout classes so panels do not rely on fixed-width viewports.
- [ ] Run the focused test and confirm it fails because the new workflow is not present.

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/WatermancerGuide.test.ts`  
Expected: the new workflow assertions fail while existing guide tests still run.

- [ ] Implement the shared screenshot frame and five grouped scenes using static React/SVG/HTML illustrations. Use verified app labels, clear captions, and accessible descriptions; keep sample values illustrative and panels responsive.
- [ ] Update the `make-and-taste` title to **Build, match, and save a water recipe** and its summary to explain the journey from targets and volume through waters, salts, matching, and the saved card.
- [ ] Mount `WatermancerGuideWorkflow` in that step and preserve its existing **Open Watermancer** action.
- [ ] Confirm no other imports remain before removing the guide-only tasting recipe component and data.
- [ ] Run the focused test and confirm all guide workflow assertions pass.
- [ ] Run the full web-app test suite, typecheck, production build, and `git diff --check`.
- [ ] Restart the existing web workflow once and inspect logs. Use rendered component tests for Step 7 because the available browser capture path cannot interact with guide navigation.
- [ ] Commit only the verified guide implementation files.

Run:
- `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/WatermancerGuide.test.ts`
- `pnpm --filter @workspace/coffee-water-calculator test`
- `pnpm --filter @workspace/coffee-water-calculator typecheck`
- `pnpm --filter @workspace/coffee-water-calculator build`
- `git diff --check`

Expected: the red test fails for the missing workflow; after implementation, all tests pass and typecheck, build, workflow startup, and diff checks complete without errors.
