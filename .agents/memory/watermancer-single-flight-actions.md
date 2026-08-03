---
name: Watermancer single-flight actions
description: Matching buttons must reject duplicate clicks and commit only one captured input snapshot at a time.
---

Watermancer actions that trigger expensive matching must use a shared immediate lock, capture immutable waters/plan inputs before computation, and release the lock on every completion path. Busy labels should paint before synchronous solver work starts.

**Why:** Repeated clicks previously felt unresponsive and could run against successive state renders, causing competing results and apparent nondeterminism.

**How to apply:** Guard Apply, Fill, and Find-best-match together; ignore duplicate clicks while busy, preserve existing solver determinism, and show explicit accepted/completed feedback.