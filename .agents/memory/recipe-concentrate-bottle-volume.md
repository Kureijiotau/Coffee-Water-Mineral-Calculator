---
name: Recipe concentrate bottle volume
description: Recipe concentrate bottles scale salt mass by strength, dose and safety by bottle size.
---

For recipe concentrates, ×1 always contains the base recipe salt amounts for one liter of final water, regardless of bottle volume. A ×N bottle contains N times those amounts; selected bottle volume changes the per-mL/drop concentration and the dose, not the total salt mass.

**Why:** A 100 mL ×1 bottle must still contain the full base recipe and dose 100 mL per liter; scaling salt mass by bottle liters produced a tenfold under-dose.

**How to apply:** Compute hydrated salt mass from the one-liter recipe target and strength. Compute dose as `bottleVolumeMl / strength` per liter, and pass the same bottle volume into per-mL, per-drop, inverse pinned-strength, solubility, precipitation, and whole-drop ceiling calculations.