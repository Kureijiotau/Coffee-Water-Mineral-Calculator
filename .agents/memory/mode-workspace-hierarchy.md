---
name: Mode workspace hierarchy
description: Durable UX boundaries for the Alchemist and Watermancer workspaces
---

Alchemist should open as a focused recipe lab: salt-recipe editing, batch/concentrate controls, and the base mineral-water panel are visible together, while Aiki's ion check stays visible.

Watermancer should lead with the ion profile. A salt recipe can be translated into an ion target profile through the existing `computeIonTotals` chemistry path; this is a target-selection view, not a second chemistry engine.

Watermancer salt-gap choices are presentation selections only. They may show used/unused salt options and preserve the selected hydration form, but they must not silently overwrite the user's recipe rows. Existing coupled-ion, bicarbonate-ceiling, and final-deviation warnings remain authoritative.

**Why:** The modes serve different users: Alchemist is for making salts/concentrates, while Watermancer is for shaping source water and closing final ionic gaps. Keeping those responsibilities visually and behaviorally distinct prevents the advanced UI from becoming one undifferentiated calculator.

**How to apply:** When adding controls to either mode, place the mode's primary decision surface first and reuse the shared salt/ion calculations rather than introducing parallel state or recommendations that mutate the recipe implicitly. Keep Alchemist's visible order as Mineral Recipe → Batch & Concentrate → Mineral Water Base.