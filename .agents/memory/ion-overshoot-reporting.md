---
name: Ion overshoot reporting
description: Final-mixture overshoot warnings must include all modeled ions, including co-ions with zero recipe targets.
---

Compare every modeled final ion against its original salt-only recipe target. Include positive excesses over the display tolerance even when the original target is zero, so unavoidable chloride, sulfate, or other co-ions are visible.

**Why:** A zero-target ion can still be introduced by mineral water or a coupled salt; filtering zero targets hides real final-water chemistry problems.

**How to apply:** Centralize the comparison over the full modeled ion definition list and keep hard-stop ions such as bicarbonate eligible for the complete list while retaining their separate explanatory warning.