---
name: Aiki hover reference range
description: Watermancer coverage bars reveal Aiki’s fixed range comparison only on hover or focus
---

Watermancer coverage bars keep their existing target-coverage presentation at rest. Hovering or focusing a bar switches its display-only comparison to Aiki’s fixed default ranges: percentage is current ppm divided by the Aiki green ceiling, so values above that ceiling read over 100%, with green and yellow range markers.

**Why:** The normal bars answer the active recipe/profile coverage question; the hover overlay provides an additional Aiki reference without changing solver targets or selected-profile behavior.

**How to apply:** Keep this as a presentation-only layer using `AIKI_DEFAULT_PROFILE.ranges`; do not use it for dosing, matching, classification, or target calculations.