---
name: Lotus shared calibration
description: Lotus dropper calibration is shared across solution cards by tip style.
---

The Lotus page should store one calibrated drop rate for Round tips and one for
Straight tips. The active tip style's rate applies to all Lotus solution cards;
do not require the same calibration to be entered separately for each salt
dropper. Tip style is a reference for which dropper the user is using; neither
style nor calibration should change the salt chemistry or salt mass for a fixed
concentrate volume. Calibration may change per-drop values and drop counts.
The official calculator's 0.56 Round / 1.00 Straight dose conversion and ion
math are public and reproducible, but Lotus does not publish its concentrate
salt-to-water batch ratios or salt hydration forms. Treat DIY stock weights as
an independent estimate, not an exact reproduction of Lotus bottle contents.
Estimate the salt-to-water mass ratio using Lotus's published 0.04 g Straight
and 0.0716 g Round average drop masses, the official 0.56 Round factor, and the
modeled salt mass per drop; exact stock ratios remain undisclosed.

**Why:** The user said both tip styles should give the same recipe numbers, with
the style selector identifying which dropper is on hand rather than changing
the recipe chemistry. They also chose to show the fixed Lotus-model reference
separately from their calibrated dropper output, so calibration cannot silently
rewrite the source-based reference. Public Lotus materials describe the recipe
calculator, ingredients, bottle size, and drop weights, but not the original
concentrate formulas. Mass balance on both published drop weights gives a closer
public-data estimate than treating drop mass as drop volume, while keeping user
calibration separate.

**How to apply:** Keep one calibration per style and share it across Lotus
solution cards. Keep salt concentration and salt-to-weigh independent of the
selected style and its measured rate; use calibration only for actual drops/mL
and user-dropper per-drop outputs. Keep the Lotus-model per-drop reference
separate from that calibrated output: the reference follows the published style
conversion but not measured drops/mL. Clearly mark inferred Lotus salt mass as
estimated. Preserve exact parity for published recipe inputs, drop-count
conversion, and ion calculations; do not claim Lotus's proprietary salt recipe
has been recovered. The mg/mL display still assumes about 1 g water per mL.