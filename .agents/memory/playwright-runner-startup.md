---
name: Playwright runner startup
description: Diagnose Playwright runner startup against the active Node and browser versions
---

An older Playwright runner may hang under a newer workspace Node runtime before producing a report, even when the app is healthy. The current runner should be kept aligned with the workspace Node and installed browser bundle.

**Why:** A healthy Vite workflow does not prove that the standalone runner and browser protocol are compatible, and repeated retries will not resolve a version mismatch.

**How to apply:** Follow the runtime/browser alignment guidance in `browser-smoke-cdp.md`; check the Node version, Playwright package version, and executable paths before debugging app behavior. For interactive checks, the browser-use CLI may be under `.local/share/uv/tools/browser-use/bin` rather than on PATH; an explicit local Chromium CDP endpoint works.