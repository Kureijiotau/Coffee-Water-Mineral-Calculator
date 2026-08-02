---
name: Watermancer salt selection
description: The durable interaction model for selecting salts and hydration forms in Watermancer
---

Watermancer uses a deliberately simple salt selection model:

- Each salt has a hydration-form selector.
- Each salt has a direct **Used / Not used** button.
- Only salts marked **Used** are passed to the existing matcher.
- The matcher calculates the dose; users do not choose an availability or fixed-dose mode.

**Why:** The availability/fixed-dose inventory added an unrequested concept and made salt selection harder to understand. The user explicitly preferred direct button selection.

**How to apply:** Keep future Watermancer salt UI expressed through form selection plus Used/Not used toggles; do not reintroduce availability or fixed-dose controls without explicit product direction.