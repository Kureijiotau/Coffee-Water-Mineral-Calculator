---
name: Playwright runner startup
description: Direct Playwright invocations may time out before creating a report in this workspace
---

Direct Playwright commands can time out before launching a visible browser, producing no test report or child process even when the app workflow is healthy.

**Why:** The configured Vite workflow and unit tests can be healthy while the standalone runner hangs during startup, so repeated retries do not distinguish application failures from runner setup.

**How to apply:** Prefer focused unit coverage for deterministic fixtures; if browser verification is required, use the configured workflow and stop after a small number of startup attempts. The browser-use CLI may be under `.local/share/uv/tools/browser-use/bin` rather than on PATH; if its daemon cannot connect, use the app preview/screenshot and report the browser test as unavailable instead of repeating startup attempts.