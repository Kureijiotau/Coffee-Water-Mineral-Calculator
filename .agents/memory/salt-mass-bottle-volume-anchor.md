---
name: Salt-mass stock-weight anchor
description: Separate-salt mass edits preserve potency while scaling target stock weight and prepared recipe equivalents.
---

In Separate salts, a physical salt-mass edit keeps the reference strength control fixed and scales that stock's target weight, salt mass, and actual prepared recipe-equivalent count together. The dose in grams and mass fraction remain unchanged. Other stocks remain independent; shared AIO and GH + KH stocks do not expose this editor.

**Why:** Users may be unable to weigh the exact calculated mass but still want to prepare the same-strength individual stock from the amount they can measure; applying this to shared AIO or GH + KH bottles could create confusing UX and coupling.

**How to apply:** Distinguish the pinned reference control from actual prepared equivalents when a batch is scaled. Clear this preparation-size anchor when target stock weight or strength is edited manually, and keep it mutually exclusive with the per-drop target.