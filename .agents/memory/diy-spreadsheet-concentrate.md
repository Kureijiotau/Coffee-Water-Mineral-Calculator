---
name: DIY spreadsheet concentrate basis
description: The top-level DIY concentrate follows the workbook's CaCO3-equivalent ppm-per-drop model.
---

The top-level DIY concentrate treats the editable ppm/drop input as CaCO3-equivalent ppm delivered by one drop, not as physical hydrated-salt ppm. Concentrate strength is solved from the selected salt's anhydrous target, bottle volume, drop calibration, and final batch volume; hydration changes physical salt mass without changing the solved strength.

Show the live per-drop readout in this same CaCO3-equivalent basis. Prefer a valid finished-stock calibration for the current composition and tip; otherwise show the water-drop estimate and label it estimated. A pinned target solves planned strength using the water-drop calibration, while finished-stock calibration reports the actual prepared stock's per-drop result.

**Why:** The user's workbook fixes the CaCO3-equivalent dose per drop and calculates different physical masses for anhydrous and hydrated forms. Solving against physical hydrated mass incorrectly cancels that difference.

**How to apply:** Keep this basis isolated to the top-level DIY single-salt workflow. Recipe concentrates should retain their existing recipe-target and physical-salt semantics. Do not present the planning target as a measured stock result.