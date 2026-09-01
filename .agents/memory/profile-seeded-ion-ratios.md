---
name: Profile-seeded ion ratios
description: Product boundary for initializing the standalone ratio editor from Watermancer targets.
---

The standalone Ion ratios editor is seeded only when the user explicitly clicks **Set ion ratios**. The selected profile’s current target values provide both the starting draft and the reset baseline for that page visit; editing the ratio page remains independent until the user explicitly imports it back.

**Why:** Users need a deliberate snapshot of the selected profile, not a live binding that overwrites manual ratio exploration; reset should return to that snapshot rather than to a generic default.

**How to apply:** Keep profile seeding at the Watermancer parent action boundary, include built-in and saved profile sources, derive GH/KH from the same target set, and use zero for missing profile ions.