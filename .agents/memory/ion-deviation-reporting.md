---
name: Ion deviation reporting
description: Show final mixed-water under- and over-target ions using the currently selected Watermancer salt doses.
---

 Final mixture deviation compares against the active mode's target: the original salt-only recipe in Alchemist, or the selected ion profile in Watermancer. Retain overshoot reporting and positive-target underdoses. In Watermancer, a salt option marked Used replaces that salt's automatic gap dose in final chemistry, displayed dosing, and deviation reporting. Do not alter the underlying editable recipe rows or force secondary ions to match.

 **Why:** Chloride, sulfate, and other coupled ions can diverge while GH/KH targets remain the important dosing constraints; reporting the deviation is safer and clearer than distorting the recommended salts. Watermancer's selected profile is the user's actual target, so comparing it to a salt recipe creates false warnings. A user's explicit salt choice must nevertheless be reflected in the chemistry they are reviewing.

**How to apply:** Keep overshoots and underdoses as separate signed entries in the existing panel. Zero-target ions can overshoot but cannot be underdosed; ignore differences within the shared display tolerance. Treat the selected Watermancer option dose as the active dose for all Watermancer final-mixture surfaces.

Watermancer Auto-craft should optimize only salts explicitly marked Used, while treating mineral/addition water and non-selected salt recommendations as fixed chemistry.

**Why:** Auto-craft is a user-directed refinement of the selected salt choices, not permission to rewrite the recipe or silently introduce new salts.

**How to apply:** Minimize total absolute ppm deviation across the active ion profile, including coupled co-ions, and invalidate the crafted result when the selected salts, waters, or target profile changes.