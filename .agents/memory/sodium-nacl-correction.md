---
name: Sodium NaCl correction
description: Optional sodium-gap correction adds NaCl and reports its coupled chloride effect.
---

When configured water plus selected salts leave sodium below the original recipe target, sodium correction may add NaCl equal to the sodium gap divided by NaCl's sodium fraction, then recompute all final ions so the accompanying chloride is visible. In Alchemist, NaCl correction is only allowed when the user's NaCl target is already nonzero; mineral water coverage must never create an unused salt dose.

**Why:** Sodium can be corrected independently as an optional taste adjustment, but adding sodium chloride necessarily changes chloride and must not be hidden or silently introduce a salt the user did not select.

**How to apply:** Keep the existing source-water/suggested-salt math unchanged when the toggle is off. When on, route the derived NaCl target through every dosing, export, recipe-step, concentrate, and final-chemistry path.