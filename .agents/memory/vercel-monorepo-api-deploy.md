---
name: Vercel monorepo API deployment
description: Vercel API deployments in this workspace must avoid the root recursive build.
---

Vercel’s default monorepo build runs the root `pnpm run build`, which attempts to build unrelated artifacts and can fail on local-only environment requirements such as `PORT`. API deployments should use an API-package-only build command.

**Why:** The workspace contains several independently runnable artifacts, but the API deployment only needs the server package and its serverless entrypoint.

**How to apply:** Keep the API Vercel project at the repository root with output-directory override disabled, and configure its build command to run only `@workspace/api-server`.