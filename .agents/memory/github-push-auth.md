---
name: GitHub push authentication
description: Environment constraint when a repository push is rejected despite a connected GitHub integration
---

The Replit GitHub integration authenticates API calls but does not automatically repair the repository’s local HTTPS Git credential. API-based file updates can sync ordinary repository files, while `.github` workflow paths may be blocked by the Cloudflare/proxy layer and Git database tree creation may be unavailable.

**Why:** A rejected local push can therefore have two separate causes: stale local Git authentication and a connector limitation on workflow paths.

**How to apply:** Verify the actual remote ref through the connected GitHub API before merging histories. If API sync is used, refresh local GitHub authentication and reconcile local history afterward; do not assume the integration changed the local Git transport. For protected `.github/workflows/*` paths, REST contents and Git-data tree writes may fail; GitHub GraphQL `createCommitOnBranch` can apply an authorized file deletion when the expected head SHA is known.

**Transfer note:** CodeExecution shell output can truncate near 64 KiB even when a larger limit is requested. Use direct workspace reads for large text files, bounded chunks for binary data, and verify the remote tree before aligning local history.