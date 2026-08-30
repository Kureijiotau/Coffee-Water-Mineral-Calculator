---
name: Watermancer active-set minimum doses
description: Practical salt-dose floors must compete with omitting the salt during coupled optimization
---

The coupled salt optimizer must compare a practical 1 mg physical dose against the zero-dose candidate instead of automatically forcing a small mathematical solution up to the floor. Custom per-salt minimums may still raise that floor.

**Why:** A 1 mg minimum is the user's measurement boundary; excluding sub-10 mg doses prevented small but useful corrections, while raising a dose beyond the user's chosen floor can still worsen coupled counter-ion accuracy.

**How to apply:** Generate zero-dose and minimum-dose outcomes through the same policy-aware score, then keep the better candidate with deterministic tie-breaking.