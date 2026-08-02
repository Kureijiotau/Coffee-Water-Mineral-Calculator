---
name: Empirical reference waters
description: Modeling published Empirical Water mineral profiles
---

Empirical Water’s Mineral Profiles page publishes finished-water ion concentrations, TDS, and approximate GH/KH values rather than the underlying salt quantities. These profiles should be represented as built-in Watermancer reference waters, preserving their published ions, not converted into salt recipes. Commercial mineral waters such as S.Pellegrino belong in the community `waters` catalog instead.

**Why:** Converting final concentrations directly into salt targets would create misleading recipes because salts contribute coupled ions; for example, sodium bicarbonate also adds sodium, and calcium chloride also adds chloride.

**How to apply:** Keep source attribution visible, add Empirical profiles through the built-in Watermancer source-water picker, and add commercial waters through the community database/API. Preserve published values in mg/L. Use salt recipes only when the source explicitly provides salt amounts or a defensible exact conversion.