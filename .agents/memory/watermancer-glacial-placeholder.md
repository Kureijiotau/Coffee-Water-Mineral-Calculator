---
name: Glacial-style matching strategy
description: Watermancer has a dedicated phased matcher for the user's Glacial-style workflow.
---

The Glacial-style matcher is a separate automated strategy, not a change to the existing Closest match behavior. It uses the currently selected Watermancer target, fills selected base waters while protecting calcium and bicarbonate, then completes calcium, magnesium with MgCl2 preference, and sodium with NaCl preference. Sulfate and chloride excess are disregarded, potassium is allowed up to 3 ppm beyond target, and sodium is allowed a small final overshoot.

**Why:** The user wants a practical, taste-driven workflow around a Glacial reference profile while preserving the existing general-purpose matcher.

**How to apply:** Keep it as its own Watermancer action. Reuse the shared chemistry engine, selected water/salt inventory, hydration forms, fixed manual doses, and live route result rather than creating a parallel calculation model.