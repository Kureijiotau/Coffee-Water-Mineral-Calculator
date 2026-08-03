---
name: Community water share feedback
description: Community-water sharing must surface request state and refresh the catalog after success.
---

Sharing a mineral-water profile must not silently fire-and-forget the POST request. The UI should prevent duplicate clicks while submitting, show success or retryable failure feedback, and refresh the community-water catalog after a successful response.

**Why:** Silent failures made it impossible to tell whether a phone submission reached the API, and the already-loaded community list stayed stale after a successful share.

**How to apply:** Treat a non-2xx response as failure, preserve the local entry for retry, and invalidate or reload the cached community list after success.