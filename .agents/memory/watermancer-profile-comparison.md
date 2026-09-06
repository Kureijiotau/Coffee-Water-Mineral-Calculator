---
name: Watermancer profile comparison
description: Product boundary for comparing Watermancer target profiles
---

Watermancer’s “Compare profiles” control is an informational comparison of two targets selected from the existing target-profile picker. It is separate from the existing reference-water ion comparison and must not change the active matching target. Show absolute ppm and relational composition together: relational shares normalize each ion against that profile’s total modeled ion load, and the shape-match score uses proportional overlap so uniformly scaled profiles remain similar.

**Why:** The user explicitly distinguished profile comparison from reference comparison and wants both available for different questions. Absolute deltas alone exaggerate differences when two waters have the same mineral balance at different overall strengths.

**How to apply:** Keep the comparison near the top of the Watermancer target card, use the same profile source catalog as the target picker, and show signed per-ion deltas as Profile B minus Profile A. Keep GH:KH in both views because it is already scale-independent; label relative differences as percentage-point share shifts rather than ppm.