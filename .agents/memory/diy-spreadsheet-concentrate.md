---
name: DIY spreadsheet concentrate basis
description: The top-level DIY concentrate follows the workbook's CaCO3-equivalent ppm-per-drop model.
---

The top-level DIY concentrate treats the editable ppm/drop input as CaCO3-equivalent ppm delivered by one drop, not as physical hydrated-salt ppm. Concentrate strength is solved from the selected salt's anhydrous target, bottle volume, drop calibration, and final batch volume; hydration changes physical salt mass without changing the solved strength.

**Why:** The user's workbook fixes the CaCO3-equivalent dose per drop and calculates different physical masses for anhydrous and hydrated forms. Solving against physical hydrated mass incorrectly cancels that difference.

**How to apply:** Keep this basis isolated to the top-level DIY single-salt workflow. Recipe concentrates should retain their existing recipe-target and physical-salt semantics.