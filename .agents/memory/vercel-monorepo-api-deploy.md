---
name: Vercel monorepo API deployment
description: Vercel API deployments in this workspace must avoid the root recursive build.
---

Vercel’s API project should stay rooted at the repository root, build only the API package, and keep its `public` output folder. The repository also uses filesystem-based Vercel functions to expose the Express app.

Vercel’s catch-all API function did not route a multi-segment account path in production, even though the same Express handler worked locally. When a request returns a Vercel edge `NOT_FOUND` while sibling API paths reach Express, add an explicit filesystem function entrypoint for the nested path or use a verified global rewrite; do not change the Express auth handler to work around an upstream routing miss.

**Why:** The monorepo contains independently runnable artifacts, and Vercel’s filesystem router can reject a deep path before Express sees it. Local route tests alone will not catch that production mapping gap.

**How to apply:** Keep the Vercel API build scoped to `@workspace/api-server`; compare edge headers and local behavior when debugging, then verify the explicit nested route on the production alias.