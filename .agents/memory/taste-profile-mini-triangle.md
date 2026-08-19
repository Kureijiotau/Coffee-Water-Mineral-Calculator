---
name: Taste profile mini triangle
description: Brewer-only interaction behavior for the Taste Profile card
---

The Taste Profile card includes a compact interactive triangle only in Brewer mode. The four Brewer flavor bars are also clickable 0–100 controls. Both surfaces drive the same shared flavor state and recipe recalculation as the main Brewer triangle; Alchemist and Watermancer stay read-only.

**Why:** The user wanted a playful second interaction surface while preserving the existing Brewer controls and keeping advanced workspaces focused on mineral design.

**How to apply:** Do not create a separate taste model for the card. Reuse the shared Brewer flavor update path, keep the main triangle unchanged, and preserve keyboard access for the bars.