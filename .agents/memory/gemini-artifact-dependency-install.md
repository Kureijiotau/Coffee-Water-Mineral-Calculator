---
name: Gemini artifact dependency installation
description: New artifact dependencies may need a package-scoped install after workspace lockfile updates
---

When adding a dependency to a newly created artifact, use the workspace package filter for the install if the generic package installer targets the monorepo root.

**Why:** The generic installer can reject a valid artifact dependency by trying to add it to the workspace root instead of the intended package.

**How to apply:** Prefer `pnpm --filter @workspace/<artifact> add ...` for artifact-local dependencies, then run the artifact's own validation scripts.