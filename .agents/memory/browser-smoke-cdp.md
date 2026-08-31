---
name: Browser smoke harness
description: Reliable interactive and automated browser checks in this headless Replit workspace
---

Use an explicit Chromium CDP endpoint for interactive checks. For automated Playwright checks, keep the runner version, browser build, and supported Node runtime aligned; in this workspace, Playwright 1.52 local runs require Node 20 rather than Node 24.

**Why:** Interactive auto-attachment can fail despite a healthy Chromium process. Separately, mismatched Playwright/browser protocols may launch successfully but fail while creating a context, and the Playwright 1.52 runner hung before reporting tests under Node 24.

**How to apply:** For interactive work, start temporary no-sandbox Chromium with a disposable profile and set `BU_CDP_URL`. For automation, prefer package-installed browser bundles in CI; when using Nix-wrapped browsers locally, match their Playwright generation and run under a supported Node release.