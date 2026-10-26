# Watermancer Guide Salt Product Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the named salt examples in Watermancer Guide Step 2 easy to recognize with subtle emphasis and accessible product-photo previews.

**Architecture:** Keep product metadata in a small typed registry and render each preview through a focused React component using the existing Radix Hover Card primitive. Represent only Step 2's highlighted phrases and product names as structured inline segments; leave the rest of the guide's detail strings unchanged.

**Tech Stack:** React, TypeScript, Radix UI Hover Card, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-26-watermancer-guide-salt-product-previews-design.md`

## Global Constraints

- Add photo previews only to the named products; generic salt types remain plain text.
- Pointer hover and keyboard focus open a preview; touch users can open it by tapping.
- Named-product triggers are low-key inline buttons with a subtle underline.
- Use actual public product photos and link each image to its source; do not copy image files into the project.
- Do not show a Zechstein package marketed for bathing as a food-use recommendation.
- Emphasize only the key guidance with the existing muted cyan/white palette; do not add bright badges or large callouts.
- Do not change salt calculations, recipes, or the guide layout.

## Review Focus

- A remote image fails to load: keep the preview readable and avoid a broken-image icon or collapsed card.
- A product photo is not food-use grade: do not present it as a suitable drinking-water ingredient.
- The guide card clips the preview: render the card through a portal.
- Keyboard users focus or dismiss the trigger: keep the trigger operable and the card reachable without a mouse.
- Touch users open the preview: support tap without breaking desktop hover behavior.

---

### Task 1: Add accessible product previews and emphasis to Step 2

**Files:**
- Create: `artifacts/coffee-water-calculator/src/watermancerGuideSaltProducts.ts`
- Create: `artifacts/coffee-water-calculator/src/WatermancerGuideSaltProductPreview.tsx`
- Modify: `artifacts/coffee-water-calculator/src/components/ui/hover-card.tsx`
- Modify: `artifacts/coffee-water-calculator/src/watermancerGuideContent.ts`
- Modify: `artifacts/coffee-water-calculator/src/WatermancerGuide.tsx`
- Modify: `artifacts/coffee-water-calculator/src/watermancerGuideContent.test.ts`
- Modify: `artifacts/coffee-water-calculator/e2e/watermancer-guide.spec.ts`

**Interfaces:**
- `GuideSaltProductId`: IDs for products with a verified food-use photo; keep Zechstein out of this union unless one is verified.
- `WATERMANCER_GUIDE_SALT_PRODUCTS`: records containing `id`, `label`, `imageUrl`, `sourceUrl`, `sourceLabel`, and descriptive `alt`.
- `WatermancerGuideDetail`: an existing plain string or `{ segments: WatermancerGuideInlineSegment[] }`.
- `WatermancerGuideInlineSegment`: `{ kind: 'text' | 'emphasis'; text: string }` or `{ kind: 'product'; productId: GuideSaltProductId }`.
- `WatermancerGuideSaltProductPreview({ productId })`: renders an inline trigger and compact source-linked photo card; failed image loads leave a readable card.
- Export `HoverCardPortal` from the existing Radix Hover Card wrapper.
- In `EntryDetails`, keep existing strings on the `MilligramTooltipText` path; render rich text segments through `MilligramTooltipText`, emphasis as semibold text in the existing muted palette, and product segments through the preview component.

**Approved image source pages:**
- Nigari: `https://foodsofnations.com/products/nigari-flakes`
- Saltverk: `https://saltverk.com/products/saltverk-pure-flaky-sea-salt`
- Vera Salt: `https://verasalt.co/products/fine-pure-natural-spring-salt-300g-microplastic-free`
- Arm & Hammer: `https://www.armandhammer.com/en/baking-soda/baking-soda-products/pure-baking-soda/baking-soda-box-8-oz`
- Zechstein is text-only unless a food-use product photo is verified.

- [ ] **Step 1: Write failing content and browser tests**

In `watermancerGuideContent.test.ts`, update the copy helper to flatten both existing strings and rich segments, then assert the hydrated-form, optional natural-flavor, and food-grade reassurance phrases; named photo examples use the expected product IDs; and generic salt types remain plain text. In Playwright, add checks that a preview opens on hover and keyboard focus, remains visible above the guide card, closes with Escape, opens on touch in a `hasTouch` Chromium context, exposes its image alt text and source link, and falls back readably when the image request fails.

- [ ] **Step 2: Run both focused tests and verify the expected failures**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/watermancerGuideContent.test.ts`
Run: `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts e2e/watermancer-guide.spec.ts`
Expected: unit assertions fail because the Step 2 content is still plain strings; browser assertions fail because the product names are not preview triggers yet.

- [ ] **Step 3: Implement the registry, preview, and rich Step 2 content**

Use the food-grade Nigari package photo from Foods of Nations, official product photos from Saltverk, Vera Salt, and Arm & Hammer, and their product-page URLs as source links. Do not add Zechstein to the preview registry unless a food-use product photo is verified; keep its name emphasized as plain text otherwise. Render previews through `HoverCardPortal`, lazy-load images with `referrerPolicy="no-referrer"`, and provide a readable fallback on image error. Style triggers as understated inline buttons with subtle underlines, support hover/focus and touch activation without making mouse clicks immediately close the card, and keep other guide-step strings and all chemistry behavior unchanged.

- [ ] **Step 4: Run focused tests and verify they pass**

Run: `pnpm --filter @workspace/coffee-water-calculator exec vitest run --config vitest.config.ts src/watermancerGuideContent.test.ts`
Run: `pnpm --filter @workspace/coffee-water-calculator exec playwright test --config playwright.config.ts e2e/watermancer-guide.spec.ts`
Expected: unit and browser assertions pass.

- [ ] **Step 5: Run full verification**

Run: `pnpm --filter @workspace/coffee-water-calculator run test`
Run: `pnpm --filter @workspace/coffee-water-calculator run typecheck`
Run: `pnpm --filter @workspace/coffee-water-calculator run build`
Expected: all tests pass, typecheck exits 0, and the production build completes.

- [ ] **Step 6: Commit the integrated Step 2 experience**

Commit the product registry, preview, rich Step 2 content, and coverage.
