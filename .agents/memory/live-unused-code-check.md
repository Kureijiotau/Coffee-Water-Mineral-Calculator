---
name: Live unused-code validation
description: Scope unused import and CSS checks to active calculator workflows while preserving archived source compatibility.
---

The live calculator's unused-code gate should distinguish active references from preserved archived source: archive-only selectors are not cleanup findings, but an archived class must never hide a separate unused class in the same selector.

**Why:** Retired workflow sources and their styles remain available for possible reintegration; broad checks otherwise either report preserved compatibility styles or miss unrelated dead CSS beside them.

**How to apply:** Keep import diagnostics on the active entry-point graph. For CSS, recognize archive-only tokens separately and continue checking every other class in compound and comma-separated selectors.
