---
name: Ion ratio import boundary
description: The accepted relationship editor behavior and its safe Watermancer handoff.
---

The ion ratio editor is a compact control surface, not a replacement for the
Watermancer target or solver workflow. GH is the primary hardness constraint:
Mg/Ca redistributes a fixed CaCO₃-equivalent GH budget, while KH is converted
to bicarbonate during import. Cl/SO₄ and Na/K remain direct ion relationships.

**Why:** GH is a weighted Mg/Ca total rather than an independent ion, so
independent GH, Mg, and Ca inputs can silently disagree. KH is effectively
bicarbonate in the supported model and must reach Watermancer to reflect an
edited alkalinity target. This GH-anchor behavior is the user-confirmed
baseline for the relationship editor.

**How to apply:** Keep ratio math and persistence isolated from Watermancer.
Preserve GH while editing Mg/Ca or its relationship, honor swapped orientation,
and merge magnesium, calcium, bicarbonate, chloride, sulfate, sodium, and
potassium into the existing target set. Leave citrates and future unrelated
targets unchanged.