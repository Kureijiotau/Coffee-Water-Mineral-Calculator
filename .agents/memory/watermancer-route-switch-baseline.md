---
name: Watermancer visible water baseline
description: The automatic Watermancer result must use the last user-controlled visible water volumes.
---

Watermancer no longer exposes route buttons or route-switching state. The visible water entries are the authoritative baseline for the automatic match and its live ion review.

**Why:** Applying hypothetical route fills to hidden state made the displayed result diverge from the editable water controls and caused route switching to accumulate volume changes.

**How to apply:** Solve from current visible base/addition water entries, recalculate the primary result directly from those volumes, and keep automatic salt targets fixed during small volume edits so the ion review remains informative.