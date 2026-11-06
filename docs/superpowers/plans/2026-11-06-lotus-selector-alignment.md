# Lotus Selector Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the Lotus dropper selector and selected-mineral summary, remove the repeated calibration badge, and preserve the current behavior.

**Architecture:** Keep the active Lotus selector in the existing concentrate workspace. Extract its current markup for a faithful visual baseline, then update only the selector presentation and use browser checks for desktop and mobile layout.

**Tech Stack:** React, TypeScript, Tailwind CSS, Playwright, Vite.

**Spec:** `docs/superpowers/specs/2026-11-06-lotus-selector-alignment-design.md`

## Global Constraints

- This is a layout-only change.
- Dropper selection, calibration state, stock calculations, ppm references, and preparation steps remain unchanged.
- The selected tip’s calibration status appears once in the collapsible calibration header.
- The optional Epsom marker stays inside the selected-mineral summary.

## Review Focus

- Desktop sizing — assert the dropdown and mineral summary align and share a consistent height.
- Mobile stacking — assert the fields stack without horizontal overflow at a 390 px viewport.
- Longer mineral labels — assert the optional Epsom marker remains inside its card.
- Calibration states — assert there is one status, and it updates when switching tip style.
- Keyboard navigation — assert both selection controls remain focusable and retain accessible names.

## Task 1: Align the Lotus selector

**Files:**
- Modify: `artifacts/coffee-water-calculator/src/MassConcentrateWorkspace.tsx`
- Test: `artifacts/coffee-water-calculator/e2e/lotus-drop-output.spec.ts`
- Reference: `docs/superpowers/specs/2026-11-06-lotus-selector-alignment-design.md`

**Interfaces:**
- Consumes: Existing Lotus dropper selection, shared calibration state, and selected-mineral data.
- Produces: The same controls and state, with an aligned layout and a single calibration-status badge.

- [ ] **Step 1: Add failing browser assertions** for matching desktop field alignment, a single selected-tip status, and stacked mobile layout with no horizontal overflow.
- [ ] **Step 2: Run the focused browser test** and confirm it fails on the current duplicate badge or layout.
- [ ] **Step 3: Extract the existing selector markup** into the mockup sandbox as a faithful “Current” baseline, then prepare the approved aligned layout from that source.
- [ ] **Step 4: Apply the approved layout** in the active Lotus workspace without changing selection, calibration, or calculation behavior.
- [ ] **Step 5: Verify** the focused Playwright test, TypeScript typecheck, desktop and phone previews, and `git diff --check`.
- [ ] **Step 6: Commit** the finished UI and test changes.
