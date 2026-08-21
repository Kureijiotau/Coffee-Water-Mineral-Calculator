---
name: Watermancer active-set minimum doses
description: Practical salt-dose floors must compete with omitting the salt during coupled optimization
---

The coupled salt optimizer must compare a practical minimum dose against the zero-dose candidate instead of automatically forcing a small mathematical solution up to the floor.

**Why:** Raising a sub-minimum dose can worsen coupled counter-ion accuracy and turn an optional salt into a harmful recipe ingredient.

**How to apply:** Generate zero-dose and minimum-dose outcomes through the same policy-aware score, then keep the better candidate with deterministic tie-breaking.