---
name: Browser smoke harness
description: Reliable interactive and automated browser checks in this headless Replit workspace
---

Use an explicit Chromium CDP endpoint for interactive checks, and make sure the browser is running in or bridged to the workspace; enabling remote debugging on the user's separate local browser does not expose it to this isolated environment. For automated Playwright checks, keep the runner version, browser build, and Node runtime aligned. Prefer the workspace-matched browser bundle when available, and enable only projects with installed executables.

**Why:** Interactive auto-attachment can fail despite a healthy Chromium process, and the user's local browser may not be reachable from the isolated workspace at all. Separately, mismatched Playwright/browser protocols may launch successfully but fail while creating a context; older runners have also hung under a newer Node runtime before reporting tests.

**How to apply:** For interactive work, start temporary no-sandbox Chromium inside the workspace with a disposable profile and set `BU_CDP_URL`; do not assume client-side remote-debugging settings create a connection into the workspace. If no such browser can be exposed, use user-provided post-refresh screenshots as evidence instead of claiming the signed-in UI was tested. For automation, check Node, Playwright, and browser executable versions together. Prefer package-installed browser bundles in CI; use a system browser only when its build is compatible with the runner. Blob-backed downloads triggered by an in-page anchor may still need a direct file/blob capture rather than waiting for Playwright's download event.

For element crops with `captureBeyondViewport`, pass explicit clip `x`, `y`, `width`, `height`, and `scale`; use document coordinates for `x` and `y` by adding the page scroll offset to the element's viewport rectangle. Prefer a cropped JPEG over a full-page capture when making UI examples.

**Why:** A viewport-relative clip can capture the wrong area after scrolling, and full-page screenshots can be too large or too small to inspect clearly.

**How to apply:** Measure the target element's `getBoundingClientRect()`, add `scrollX` and `scrollY` to its origin, provide the resulting clip dimensions explicitly, then review the crop before reusing it.