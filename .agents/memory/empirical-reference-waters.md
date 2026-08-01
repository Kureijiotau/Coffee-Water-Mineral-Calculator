---
name: Empirical reference waters
description: Modeling published Empirical Water mineral profiles
---

Empirical Water’s Mineral Profiles page publishes finished-water ion concentrations, TDS, and approximate GH/KH values rather than the underlying salt quantities. These profiles should be represented as built-in Watermancer reference waters, preserving their published ions, not converted into salt recipes.

**Why:** Converting final concentrations directly into salt targets would create misleading recipes because salts contribute coupled ions; for example, sodium bicarbonate also adds sodium, and calcium chloride also adds chloride.

**How to apply:** Keep source attribution visible, add reference profiles through the Watermancer source-water picker, and preserve the published values in mg/L. Use salt recipes only when the source explicitly provides salt amounts or a defensible exact conversion.