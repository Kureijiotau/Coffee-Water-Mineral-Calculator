---
name: Watermancer single-flight actions
description: Matching buttons must reject duplicate clicks and commit only one captured input snapshot at a time.
---

Watermancer actions that trigger expensive matching must use a shared immediate lock, capture immutable waters/plan inputs before computation, and release the lock on every completion path. Busy labels should paint before synchronous solver work starts.

**Why:** Repeated clicks previously felt unresponsive and could run against successive state renders, causing competing results and apparent nondeterminism.

**How to apply:** Guard Apply, Fill, and Find-best-match together; ignore duplicate clicks while busy, preserve existing solver determinism, and show explicit accepted/completed feedback.

Best-match actions should also capture an input signature and validate it before and after deferred synchronous work; if waters, targets, salts, or settings changed, discard the result and explain that nothing was applied.

**Why:** Mobile browsers can accept a touch, repaint, and process a nearby edit before the deferred route sweep runs, so committing the old winner creates apparently random builds.

**How to apply:** Yield one paint before expensive sweeps, compare the captured signature with the latest one, and always release the shared busy lock through the completion path.