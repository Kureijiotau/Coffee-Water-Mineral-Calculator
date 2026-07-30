---
name: Ion deviation reporting
description: Show final mixed-water under- and over-target ions without changing suggested salt calculations.
---

Final recipe deviation is informational: compare the existing final mixture against the original salt-only targets, retain all overshoot reporting, and add positive-target underdoses alongside it. Do not alter suggested salt math to force secondary ions to match.

**Why:** Chloride, sulfate, and other coupled ions can diverge while GH/KH targets remain the important dosing constraints; reporting the deviation is safer and clearer than distorting the recommended salts.

**How to apply:** Keep overshoots and underdoses as separate signed entries in the existing panel. Zero-target ions can overshoot but cannot be underdosed; ignore differences within the shared display tolerance.