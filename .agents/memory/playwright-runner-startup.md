---
name: Playwright runner startup
description: Direct Playwright invocations may time out before creating a report in this workspace
---

Direct Playwright commands under the default Node 24 runtime can hang before producing a report even when the app is healthy. The existing Playwright generation runs successfully with Node 20 and the available system Chromium.

**Why:** The configured Vite workflow and unit tests can be healthy while the standalone runner hangs during startup, so repeated retries do not distinguish application failures from runner setup.

**How to apply:** Follow the runtime/browser alignment guidance in `browser-smoke-cdp.md`; discover available Node 20 and Chromium binaries rather than repeatedly retrying the default runner. Point Playwright at the already-running workflow port and available system Chromium. The browser-use CLI may be under `.local/share/uv/tools/browser-use/bin` rather than on PATH; an explicit local Chromium CDP endpoint works for interactive checks.