# Watermancer Guide Step 7 Text-First Screenshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Step 7’s instructions prominent, keep screenshots visible as compact previews, and open each capture full-size on click, using the verified Guide recipe instead of Kimoi.

**Architecture:** `WatermancerGuideScreenshotFrame` owns the visible thumbnail and the existing Radix dialog interaction. The workflow scene components supply text-first, ion-colored instructions. The screenshot assets are recaptured from the running Watermancer with the exact recipe and app-computed final readings; the chemistry engine and catalog remain unchanged.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, the existing Radix dialog wrapper, Vitest, and the workspace Chromium/CDP browser for live screenshot capture and interaction checks.

**Spec:** `docs/superpowers/specs/2026-10-20-watermancer-guide-workflow-screenshots-design.md`

**Execution:** Implement natively in an isolated worktree, following the earlier workspace choice; do not delegate or push.

## Global Constraints

- Name the sample **Guide recipe**.
- Preserve the provided quantities exactly: 1 L batch; 966 mL RO/distilled water; 34 mL Evian; 14 mg MgSO₄·7H₂O; 20 mg MgCl₂·6H₂O; 4 mg NaCl; 2 mg KCl.
- Use the existing Evian profile for the source-water contribution and let the live Watermancer calculation produce final readings.
- Do not change or remove Kimoi from the actual catalog; no Step 7 text or screenshot may show Kimoi.
- Keep every screenshot visible as a small preview, with a maximum width around 360 px; do not hide previews.
- Clicking a preview opens the original screenshot at a larger, viewport-fitted size in the existing accessible dialog.
- Color ion names and formulas with the existing `ION_MAP` colors.
- Do not change recipe storage, matching logic, the shared water catalog, salt behavior, exports, recipe-card generation, or other guide steps.
- Do not add dependencies or publish/share any example water during screenshot capture.

## Review Focus

1. The exact 1 L amounts and hydrated salt formulas must survive copy changes and remain internally consistent in the guide text.
2. The Evian source contribution must use the existing catalog profile (Na 6.5, Ca 80, SO₄ 14, Mg 26, K 1, HCO₃ 360 mg/L) without mutating shared data.
3. Kimoi can appear inside raster assets even when guide markup is clean; manually inspect every refreshed screenshot.
4. The dialog must work with mouse and keyboard, close on Escape, and return focus to its preview button.
5. At 402 px width, captions and previews must remain visible without horizontal overflow.

---

### Task 1: Make each screenshot a compact, accessible preview

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/WatermancerGuideScreenshotFrame.tsx`
- Modify: `artifacts/coffee-water-calculator/src/WatermancerGuide.test.ts`
- Modify: `artifacts/coffee-water-calculator/e2e/watermancer-guide.spec.ts`

**Interfaces:**
- Keep the existing `title`, `description`, `testId`, `screenshotFileName`, and `imageAlt` props.
- Change `description` to `ReactNode` so scene copy can use the existing ion-color components.
- Render a visible `type="button"` preview with an accessible name derived from its title and a `data-testid` ending in `-preview`.
- Use the existing `Dialog`, `DialogTrigger`, `DialogContent`, `DialogTitle`, and `DialogDescription` exports. The dialog image must reuse the same full screenshot URL as the preview.

- [ ] **Step 1: Write the failing preview tests**

Update the outdated Step 7 accordion assertions in `e2e/watermancer-guide.spec.ts`. Assert that all ten screenshot previews are visible, each is at most 360 px wide, and a preview button opens a dialog containing the same full-size image. Verify the close button and Escape dismiss the dialog and restore focus. Update `WatermancerGuide.test.ts` to assert each figure has its caption before the button-wrapped thumbnail, meaningful alt text, and the expected preview test ID.

- [ ] **Step 2: Run the focused test and confirm it fails for the current non-clickable images**

Run:

```bash
pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/WatermancerGuide.test.ts
pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/watermancer-guide.spec.ts --project=chromium
```

Expected: FAIL because the current figures render plain images rather than preview buttons and cannot open a dialog.

- [ ] **Step 3: Implement the compact preview and full-size dialog**

Update `WatermancerGuideScreenshotFrame.tsx` to place title and description before the image, put the caption and preview in a two-column layout above the mobile breakpoint, and constrain the visible preview to `max-w-[360px]`. Open the full-size image in a viewport-fitted dialog with a title, description, visible close control, and contained image.

- [ ] **Step 4: Run the focused test and confirm it passes**

Run:

```bash
pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/WatermancerGuide.test.ts
pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/watermancer-guide.spec.ts --project=chromium
```

Expected: PASS with ten accessible preview triggers and verified dialog open/close behavior.

- [ ] **Step 5: Commit the preview interaction**

```bash
git add artifacts/coffee-water-calculator/src/WatermancerGuideScreenshotFrame.tsx artifacts/coffee-water-calculator/src/WatermancerGuide.test.ts artifacts/coffee-water-calculator/e2e/watermancer-guide.spec.ts
git commit -m "Make Watermancer guide screenshots expandable"
```

### Task 2: Emphasize instructions and show the Guide recipe

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/WatermancerGuideWorkflow.tsx`
- Modify: `artifacts/coffee-water-calculator/src/WatermancerGuideWorkflowPrimitives.tsx`
- Modify: `artifacts/coffee-water-calculator/src/WatermancerGuideWorkflowRecipeSetupScenes.tsx`
- Modify: `artifacts/coffee-water-calculator/src/WatermancerGuideWorkflowWaterScene.tsx`
- Modify: `artifacts/coffee-water-calculator/src/WatermancerGuideWorkflowMatchingScene.tsx`
- Modify: `artifacts/coffee-water-calculator/src/WatermancerGuideWorkflowRecipeCardScene.tsx`
- Modify: `artifacts/coffee-water-calculator/src/WatermancerGuide.test.ts`
- Modify: `artifacts/coffee-water-calculator/e2e/watermancer-guide.spec.ts`

**Interfaces:**
- Continue using the five existing `WorkflowScene` groups and ten screenshot frames.
- Use `IonName` or `IonChip` from `WatermancerGuideIonTokens.tsx` for ion formulas; do not introduce new ion colors.

- [ ] **Step 1: Write failing content and hierarchy assertions**

Add tests that Step 7 names **Guide recipe**, shows the exact 1 L amounts and salt forms, contains no `Kimoi` text, retains all five scene headings and requested actions, renders the `ION_MAP` foreground colors for the ion formulas, and keeps the Step 6 range guide intact.

- [ ] **Step 2: Run the focused test and confirm the new assertions fail**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/WatermancerGuide.test.ts`

Expected: FAIL because the current guide does not include the supplied recipe details or Guide recipe label.

- [ ] **Step 3: Update scene hierarchy and copy**

Set scene headings to `text-lg sm:text-xl` and scene summaries to `text-sm leading-6 text-slate-200`. Add a text-first Guide recipe summary in `WatermancerGuideWorkflow.tsx` with the exact batch, water, and salt amounts. Put each screenshot title and explanation before or beside its visible preview. Highlight ion names/formulas through the existing `ION_MAP` color components. Preserve all existing feature explanations, reset semantics, and Step 6 content.

- [ ] **Step 4: Run the focused test and confirm it passes**

Run:

```bash
pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/WatermancerGuide.test.ts
pnpm --filter @workspace/coffee-water-calculator run test:browser -- e2e/watermancer-guide.spec.ts --project=chromium
```

Expected: PASS with the exact Guide recipe copy, no Kimoi text, preserved workflow actions, and the existing ion colors.

- [ ] **Step 5: Commit the text-first guide**

```bash
git add artifacts/coffee-water-calculator/src/WatermancerGuideWorkflow.tsx artifacts/coffee-water-calculator/src/WatermancerGuideWorkflowPrimitives.tsx artifacts/coffee-water-calculator/src/WatermancerGuideWorkflowRecipeSetupScenes.tsx artifacts/coffee-water-calculator/src/WatermancerGuideWorkflowWaterScene.tsx artifacts/coffee-water-calculator/src/WatermancerGuideWorkflowMatchingScene.tsx artifacts/coffee-water-calculator/src/WatermancerGuideWorkflowRecipeCardScene.tsx artifacts/coffee-water-calculator/src/WatermancerGuide.test.ts artifacts/coffee-water-calculator/e2e/watermancer-guide.spec.ts
git commit -m "Emphasize the Watermancer guide recipe instructions"
```

### Task 3: Recapture and verify the live Guide recipe screenshots

**Files:**
- Replace: `artifacts/coffee-water-calculator/public/watermancer-guide/recipe-picker.jpg`
- Replace: `artifacts/coffee-water-calculator/public/watermancer-guide/recipe-actions.jpg`
- Replace: `artifacts/coffee-water-calculator/public/watermancer-guide/ion-targets.jpg`
- Replace: `artifacts/coffee-water-calculator/public/watermancer-guide/batch-volume.jpg`
- Replace: `artifacts/coffee-water-calculator/public/watermancer-guide/add-water-source.jpg`
- Replace: `artifacts/coffee-water-calculator/public/watermancer-guide/community-waters.jpg`
- Replace: `artifacts/coffee-water-calculator/public/watermancer-guide/share-water.jpg`
- Replace: `artifacts/coffee-water-calculator/public/watermancer-guide/enabled-salts.jpg`
- Replace: `artifacts/coffee-water-calculator/public/watermancer-guide/best-match.jpg`
- Replace: `artifacts/coffee-water-calculator/public/watermancer-guide/recipe-card.jpg`

**Interfaces:**
- Keep the existing ten image filenames and the `BASE_URL`-based screenshot paths.
- Use the live Watermancer interface and a disposable browser profile; do not modify shared catalog data or publish a Community water.

- [ ] **Step 1: Prepare the live Watermancer example**

In the running app, use a disposable browser profile to select/create **Guide recipe**, set a 1 L batch, use 966 mL RO/distilled water and 34 mL Evian, and enter 14 mg MgSO₄·7H₂O, 20 mg MgCl₂·6H₂O, 4 mg NaCl, and 2 mg KCl. Confirm the Evian source uses the existing profile values—Na 6.5, Ca 80, SO₄ 14, Mg 26, K 1, HCO₃ 360 mg/L—without editing the shared catalog. Read final ions from the live result.

- [ ] **Step 2: Capture the workflow screens from the real app**

Recapture all ten screenshot assets so the recipe selection and final card consistently show **Guide recipe** and the provided quantities. Keep the other requested feature examples focused on their live controls. Do not capture a visible Kimoi item or submit a share action.

- [ ] **Step 3: Visually audit every asset**

Create a temporary contact sheet outside the repository and inspect it plus the full-size recipe-picker and recipe-card captures. Expected: all screenshots are authentic, no screenshot contains Kimoi, and the final card shows the exact water and salt quantities with app-calculated final readings.

- [ ] **Step 4: Run the complete package checks**

Run:

```bash
pnpm --filter @workspace/coffee-water-calculator run test
pnpm --filter @workspace/coffee-water-calculator run typecheck
pnpm --filter @workspace/coffee-water-calculator run build
```

Expected: all tests pass, typecheck succeeds, and the production build includes all ten screenshot files.

- [ ] **Step 5: Verify the preview and dialog at desktop and mobile sizes**

Open Step 7 at 1280 × 1000 and 402 × 874. Confirm each small preview stays visible, no horizontal overflow appears, activating a preview shows its full-size screenshot, and both the close button and Escape dismiss the dialog with focus restored.

- [ ] **Step 6: Commit the verified screenshot assets**

```bash
git add artifacts/coffee-water-calculator/public/watermancer-guide
git commit -m "Refresh Watermancer guide screenshots with Guide recipe"
```
