---
name: TDS meter versus modeled ion total
description: The recipe's summed ion ppm is not guaranteed to match a conductivity-based TDS meter.
---

The calculator's recipe-step “expected TDS” is the sum of modeled dissolved-ion concentrations, including source-water ions and salt-derived ions. A handheld TDS meter infers TDS from conductivity using its own conversion factor, so its ppm display may read materially lower or higher for the same water, especially with sulfate, bicarbonate, calcium, and magnesium profiles.

**Why:** A Glacial-profile batch modeled at about 61 ppm produced a meter reading near 40 ppm; this can be measurement-scale behavior rather than an incorrect recipe, while the recipe also contains tiny salt doses that are hard to weigh.

**How to apply:** Do not add salt solely to force a conductivity meter to match the modeled ppm. First verify meter calibration/conversion factor, temperature, probe cleanliness, RO baseline, full dissolution, final volume, and source-water identity. Present the app value as a modeled ion total or explain the distinction when users compare it with a TDS meter.