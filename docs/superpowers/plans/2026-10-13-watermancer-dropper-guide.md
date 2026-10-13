# Watermancer Dropper Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate, lazy-loaded Watermancer Guide that teaches the approved calibrated 1 mg/drop workflow and target-first recipe path without storing pantry or guide-progress data.

**Architecture:** Keep the guide copy in a small typed content module and render it in a separate `WatermancerGuide` component with local-only step state and explicit navigation callbacks. Add a new app-level tab beside the existing Guide, lazy-load its component, and route its two actions through the existing DIY Concentrate and Watermancer navigation handlers.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vite, Vitest, Playwright. No new package dependencies.

**Spec:** `docs/superpowers/specs/2026-10-13-watermancer-dropper-guide-design.md`

## Global Constraints

- Teach one salt per dropper, calibrated to deliver 1 mg of the selected physical salt per drop.
- Treat the existing DIY Concentrate tool's displayed mg/drop and its specific preparation warnings as authoritative.
- Keep physical salt mg/drop distinct from ion ppm in finished water; use `drops = required salt mg ÷ actual salt mg per drop`, and only equate mg to drops when the actual stock measures 1 mg/drop.
- Lead with balanced final-ion targets and Watermancer's existing salt-dose calculation; do not add chemistry or solver calculations to the guide.
- Match the prepared stock's physical hydration form to the selected Watermancer salt form.
- Explain mineral-water contributions and a 1 L final batch topped up with 0-TDS water to a verified 1 L line or brim; users do not need to weigh the remaining top-up water.
- Do not promise taste outcomes, prescribe universal ion targets, or equate conductivity-meter TDS with the sum of modeled ions.
- Do not portray 1 mg/drop itself as inherently risky; keep warnings specific to the existing tool.
- Do not save a pantry, guide progress, recipe inputs, or target changes from guide navigation.
- Leave Magnesium Hydroxide and Calcium Carbonate out of the guide; their existing Watermancer chemistry remains unchanged.
- Do not change the existing Guide / Brewer Week 1 flow, concentrate defaults, or Watermancer solver.
- In DIY Lotus per-drop tables, identify the physical salt formula and hydration form beside the salt-mass value; keep the ppm column labeled as the finished-water ion contribution.

## Review Focus

- App-level **Guide** and **Watermancer Guide** remain distinct, keyboard-focusable tabs with correct selected state; cover in the app-tab browser test.
- The Watermancer Guide chunk is not requested until its tab is selected; cover in `deferred-workspaces.spec.ts`.
- Opening DIY Concentrate or Watermancer from the guide preserves an existing ion target; cover in the navigation browser test.
- Leaving and returning resets the guide step instead of restoring persisted progress; cover in the guide browser test.
- At a narrow viewport, guide navigation and reference sections remain usable without horizontal page overflow; cover in the mobile browser test.
- Guide copy never gives SodaStream preparation or dose-per-drop guidance, does not confuse salt mg with ion ppm, and does not promise a universal taste result; cover in the content unit test.
- The existing Week 1 Guide and core Concentrates / Watermancer flows remain usable; cover in the app-workspace browser tests.

---

### Task 1: Build the guide content and accessible guide component

**Files:**
- Create: `artifacts/coffee-water-calculator/src/watermancerGuideContent.ts`
- Create: `artifacts/coffee-water-calculator/src/WatermancerGuide.tsx`
- Test: `artifacts/coffee-water-calculator/src/watermancerGuideContent.test.ts`

**Interfaces:**
- `WatermancerGuide` default export accepts `{ onOpenDiyConcentrate: () => void; onOpenWatermancer: () => void }`.
- The content module exports ordered guided steps and independently accessible reference topics; it contains no preparation or per-drop instructions for the two excluded powders.

- [x] **Step 1: Write the failing content test**

  Add `watermancer guide copy distinguishes salt mass from finished-water ions`. Assert that the ordered steps cover supplies, weighing a known number of drops, 1.00 mg/drop stock preparation, balanced targets with source water, hydration-form matching, the dose formula, and topping a 1 L batch to a verified 1 L line or brim with 0-TDS water. Assert that reference topics cover calibration, hydration form, charge balance, mineral-water contribution, final volume, dose conversion, and controlled taste iteration. Assert that no exported guide text contains “SodaStream”, “Magnesium Hydroxide”, or “Calcium Carbonate”.

- [x] **Step 2: Run the focused test and confirm it fails**

  Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/watermancerGuideContent.test.ts`

  Expected: FAIL because the content module is not implemented.

- [x] **Step 3: Implement the typed guide content**

  Create `watermancerGuideContent.ts` with six ordered steps and the eight reference topics defined in the approved spec. Preserve the spec's chemistry boundaries, exact dose formula, tool-owned preparation values, and careful distinctions between finished-water ions and conductivity-meter TDS.

- [x] **Step 4: Implement the guide component**

  Create `WatermancerGuide.tsx` using the exact callback props above. Use transient component state for step navigation only; provide accessible Previous step / Next step controls and independently openable reference topics. Include contextual actions named **Open DIY Concentrate** and **Open Watermancer**. Use the design subagent for this component only; leave app-tab integration to Task 2.

- [x] **Step 5: Verify the component and copy**

  Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/watermancerGuideContent.test.ts`

  Expected: PASS, including the exclusion and chemistry-boundary assertions.

  Run: `pnpm --filter @workspace/coffee-water-calculator run typecheck`

  Expected: PASS.

---

### Task 2: Add the lazy-loaded app tab and preserve recipe state during navigation

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/App.tsx`
- Modify: `artifacts/coffee-water-calculator/e2e/concentrates-mode.spec.ts`
- Modify: `artifacts/coffee-water-calculator/e2e/deferred-workspaces.spec.ts`
- Modify: `artifacts/coffee-water-calculator/e2e/lotus-drop-output.spec.ts`
- Create: `artifacts/coffee-water-calculator/e2e/watermancer-guide.spec.ts`

**Interfaces:**
- Extend `AppTab` with `'watermancer-guide'`.
- The top-level tab opens the guide independently of the existing **Guide** tab.
- Guide actions call the existing `handleOpenConcentrates` and `handleCalculatorModeChange('watermancer')` navigation behavior; they do not write recipe or target state.

- [x] **Step 1: Write the failing browser tests**

  Update the expected app-workspace tab list to include **Watermancer Guide** as a separate entry after **Guide**. Extend the deferred-module check so the guide module is absent before selection and requested after selection. Add a browser test that verifies:
  - the new tab and existing Guide have independent selected states;
  - the new tab can be activated with the keyboard, renders the guide heading and first step, and its Previous / Next controls work;
  - quick-reference topics open independently;
  - the accessible guide actions open DIY Concentrate and Calculator → Watermancer;
  - a previously entered `watermancer-ion-target-calcium` value remains unchanged after navigating away and back;
  - leaving and re-entering the guide starts at the first step;
  - the existing Week 1 Guide remains distinct and usable;
  - the guide has no horizontal overflow at a 390 px viewport;
  - DIY Lotus per-drop tables identify each physical salt formula and hydration form beside salt mg, without changing the ion ppm label.

- [x] **Step 2: Confirm the browser-test red state before integration**

  The Playwright runner was not usable locally because the Node 24 / Playwright 1.52 startup attempts time out. Before integration, a headless Chromium CDP check confirmed that the new guide tab was absent; the ruling and limitation are recorded in the progress ledger.

- [x] **Step 3: Integrate the new workspace**

  In `App.tsx`, add the app-tab value and accessible tab entry next to **Guide**, lazy-load `WatermancerGuide`, and render it with `Suspense` in its own app-tab branch. Pass callbacks that use the existing navigation handlers. Do not add guide state to persistence or recipe snapshots. In the existing DIY Lotus per-drop table, label the salt-dose column with the current physical salt formula and hydration form; leave the ion-contribution label unchanged.

- [x] **Step 4: Verify browser behavior and run the complete package checks**

  Manual Chromium CDP checks passed for separate tabs, keyboard activation, lazy guide loading, step navigation/reset, independent references, tool navigation, saved-target preservation, Lotus salt/hydration labels, and 390 px overflow. The Playwright runner itself remains unexecuted locally for the reason above.

  Run: `pnpm --filter @workspace/coffee-water-calculator run test`

  Expected: PASS.

  Run: `pnpm --filter @workspace/coffee-water-calculator run typecheck`

  Expected: PASS.

  Run: `pnpm --filter @workspace/coffee-water-calculator exec tsc --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --types node e2e/watermancer-guide.spec.ts e2e/lotus-drop-output.spec.ts`

  Expected: PASS.

  Run: `pnpm --filter @workspace/coffee-water-calculator run build`

  Expected: build completes successfully. Vite may report existing sourcemap and large-chunk warnings.
