# Water Tasting Profile Mineral Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the selected available water profile's mineral-analysis card inline in Water Tasting.

**Architecture:** `WaterTastingTab` will read the selected source ID, confirm it exists in `profileOptions`, and render the existing `renderProfileAnalysis(sourceId)` result below the profile selector. Chemistry calculations remain in the parent and `MineralAnalysisLabel`.

**Tech Stack:** React, TypeScript, Playwright, Vitest

**Spec:** `docs/superpowers/specs/2026-10-22-water-tasting-profile-analysis-design.md`

## Global Constraints

- Render the card directly below the selector only when the selected source ID matches an available profile option.
- Reuse `renderProfileAnalysis(sourceId)`; do not add another chemistry calculation path.
- Keep the change display-only; do not change profiles, tasting records, or persistence.

## Review Focus

- **No profile selected:** no analysis wrapper is rendered.
- **Unavailable legacy profile:** editing a tasting whose source was removed does not show an empty analysis card.
- **Profile switching:** selecting a different available source replaces the card contents.
- **Sparse or zero readings:** the card renders numeric values and never displays `NaN`.
- **Saved profile readings:** finished-water readings and target readings remain distinct and match the selected profile.

---

### Task 1: Render the selected profile analysis

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/WaterTastingTab.tsx`
- Test: `artifacts/coffee-water-calculator/e2e/water-tasting.spec.ts`

**Interfaces:**
- Consumes the existing `profileOptions: WaterTastingProfileOption[]` and `renderProfileAnalysis(sourceId: string): ReactNode` props.
- Produces `data-testid="panel-tasting-profile-analysis"` around the existing analysis card only for an available selected source.

- [ ] **Step 1: Update the browser assertions**

  In `records water’s effect with five sliders and edits a partial tasting`, assert the panel is absent before selection and, after selecting `safe-profile`, contains “Aiki's (Light Roast Pourover) safe profile” and “Mineral analysis”. Replace its current zero-panel assertion.

  In `shows the existing mineral analysis card for each profile source`, verify the panel is initially absent and retain the source-switching, reading, and no-`NaN` assertions.

  In `keeps a deleted profile name available when editing its tasting`, verify that the unavailable legacy source does not produce an empty analysis panel.

- [ ] **Step 2: Run the focused tests and confirm the missing-card failure**

  From `artifacts/coffee-water-calculator`, run:

  ```bash
  PLAYWRIGHT_PORT=4193 PLAYWRIGHT_CHROMIUM_EXECUTABLE="$REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE" pnpm exec playwright test --config playwright.config.ts e2e/water-tasting.spec.ts --project=chromium --workers=1 --reporter=line --grep 'records water|shows the existing mineral analysis card|keeps a deleted profile name'
  ```

  Expected before implementation: the selected-profile card assertions fail because `WaterTastingTab` currently does not render the callback.

- [ ] **Step 3: Render the existing callback beneath the selector**

  In `WaterTastingTab.tsx`, read the selected `profileSourceId`. When a matching option exists in `profileOptions`, render `renderProfileAnalysis(profileSourceId)` inside the panel wrapper directly after the selector. Do not render the wrapper for an empty or unavailable source ID.

- [ ] **Step 4: Verify the Water Tasting E2E suite**

  From `artifacts/coffee-water-calculator`, run:

  ```bash
  PLAYWRIGHT_PORT=4194 PLAYWRIGHT_CHROMIUM_EXECUTABLE="$REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE" pnpm exec playwright test --config playwright.config.ts e2e/water-tasting.spec.ts --project=chromium --workers=1 --reporter=line
  ```

  Expected: all nine Water Tasting tests pass, including source switching and unavailable-source assertions.

- [ ] **Step 5: Verify unit tests and the workspace build**

  Run `pnpm --filter @workspace/coffee-water-calculator run test` and `PORT=8081 BASE_PATH=/ pnpm run build`. Both must exit successfully.

- [ ] **Step 6: Restart the web workflow and smoke-check the preview**

  Restart `artifacts/coffee-water-calculator: web`, confirm it starts without errors, and inspect the calculator preview.

- [ ] **Step 7: Commit the implementation**

  Commit only `src/WaterTastingTab.tsx` and `e2e/water-tasting.spec.ts` with the message `Restore Water Tasting profile analysis card`.
