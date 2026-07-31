---
name: API health route
description: The calculator API exposes health at the versioned /api/healthz endpoint.
---

The API health check is `/api/healthz`, not `/health` or `/api/health`.

**Why:** Probing the wrong path produces a misleading 404 even when the API and database-backed water routes are healthy.

**How to apply:** Use `/api/healthz` for workflow/API checks, and use `/api/waters` to verify the community-water data path.