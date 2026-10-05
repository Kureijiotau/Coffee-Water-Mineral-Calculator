---
name: Citrate ratio eligibility
description: When Citrates belongs in the custom Watermancer ion ratio.
---

Include Citrates in the custom ratio cycle only when its current final-water reading is positive. If a saved pair includes Citrates and the final reading becomes zero, reset the pair to Na:K and persist that fallback. Keep all chemistry targets and calculations unchanged.

**Why:** The user wants Citrates hidden when unused and excluded from a new ratio unless active; Na:K is the agreed fallback when an existing Citrates pair becomes inactive.

**How to apply:** Base eligibility on the current final Citrates reading, while leaving Citrates available in the cycle and preserving its value whenever it is being used.