---
name: Citrate alkalinity estimate
description: Keep citrate's estimated bicarbonate-equivalent contribution separate from KH and solver targets.
---

Show a separate HCO₃⁻-equivalent reading that combines actual bicarbonate with citrate's modeled charge contribution. Treat it as an estimate, not as measured or guaranteed alkalinity.

**Why:** The app models citrate with a full 3− charge, but real alkalinity depends on pH and speciation.

**How to apply:** Show the estimate only when final citrate is present, label it as estimated, and do not fold it into existing KH calculations or Watermancer target matching without a pH/speciation model.
