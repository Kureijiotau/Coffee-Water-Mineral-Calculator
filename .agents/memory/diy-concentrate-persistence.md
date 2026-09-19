---
name: DIY concentrate persistence scope
description: The DIY concentrate remembers its own last-used inputs without sharing persistence with Recipe Concentrate.
---

The top-level DIY Concentrate tab persists its last-used mineral, hydration form, bottle/calibration inputs, ppm-per-drop target, final volume, dropper style, and plan values in a dedicated local preference. Recipe Concentrate and DIY Lotus Drops do not read this preference.

**Why:** The user explicitly wants DIY values remembered while keeping Recipe Concentrate independent.

**How to apply:** Keep DIY persistence scoped to the DIY builder and key saved plans by salt so switching minerals does not reuse another mineral's values.