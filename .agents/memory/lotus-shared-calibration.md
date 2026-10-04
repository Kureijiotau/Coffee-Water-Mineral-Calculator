---
name: Lotus shared calibration
description: Lotus dropper calibration is shared across solution cards by tip style.
---

The Lotus page should store one calibrated drop rate for Round tips and one for
Straight tips. The active tip style's rate applies to all Lotus solution cards;
do not require the same calibration to be entered separately for each salt
dropper.

**Why:** The user wants one calibration to apply across the droppers, while
keeping Round and Straight rates separate because their drop behavior differs.

**How to apply:** Keep shared Lotus calibration state keyed by tip style, not by
solution card. Preserve the existing style distinction and use the selected
style's shared measurement for all cards.