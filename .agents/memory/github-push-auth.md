---
name: GitHub push authentication
description: Environment constraint when a repository push is rejected despite a connected GitHub integration
---

The Replit GitHub integration authenticates API calls but does not automatically repair the repository’s local HTTPS Git credential. API-based file updates can sync ordinary repository files, while `.github` workflow paths may be blocked by the Cloudflare/proxy layer and Git database tree creation may be unavailable.

**Why:** A rejected local push can therefore have two separate causes: stale local Git authentication and a connector limitation on workflow paths.

**How to apply:** Verify the actual remote ref through the connected GitHub API before merging histories. If API sync is used, refresh local GitHub authentication and reconcile local history afterward; do not assume the integration changed the local Git transport.