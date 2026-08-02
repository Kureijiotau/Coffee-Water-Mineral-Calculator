---
name: Mode workspace hierarchy
description: Durable UX boundaries for the Alchemist and Watermancer workspaces
---

Alchemist should open as a focused recipe lab: salt-recipe editing, batch/concentrate controls, and the base mineral-water panel are visible together, while Aiki's ion check stays visible.

Alchemist Auto-fill uses the Balanced GH / KH priority internally and does not expose the Auto-fill settings menu. Watermancer retains the configurable Auto-fill preset and deviation controls.

Alchemist base-water completion uses strict zero-deviation, all-ion ceiling protection and shows simple recipe-relative ion gaps plus recommended salt amounts; used/unused salt option cards remain Watermancer-only.

Alchemist Auto-fill must ignore zero-target co-ions while enforcing exact ceilings for positive recipe ions; Watermancer keeps zero-target ion protection.

Alchemist Auto-fill uses tenth-of-a-milliliter source volumes to reduce safe underfill near tight ion ceilings; Watermancer retains whole-milliliter fill steps.

Alchemist Auto-fill may use up to +0.5 ppm on a positive target only when that extra volume gains at least 0.5 ppm on another still-under-target positive recipe ion; zero-target co-ions remain hard ceilings.

Alchemist source-water recommendations automatically add enough NaCl to close a sodium gap even when chloride overshoots; the final ion deviation disclosure makes that tradeoff visible below Suggested salts.

Watermancer should lead with the ion profile. A salt recipe can be translated into an ion target profile through the existing `computeIonTotals` chemistry path; this is a target-selection view, not a second chemistry engine.

Watermancer salt-gap choices are presentation selections only. They may show used/unused salt options and preserve the selected hydration form, but they must not silently overwrite the user's recipe rows. Existing coupled-ion, bicarbonate-ceiling, and final-deviation warnings remain authoritative.

**Why:** The modes serve different users: Alchemist is for making salts/concentrates, while Watermancer is for shaping source water and closing final ionic gaps. Keeping those responsibilities visually and behaviorally distinct prevents the advanced UI from becoming one undifferentiated calculator.

**How to apply:** When adding controls to either mode, place the mode's primary decision surface first and reuse the shared salt/ion calculations rather than introducing parallel state or recommendations that mutate the recipe implicitly. Keep Alchemist's visible order as Mineral Recipe → Batch & Concentrate → Mineral Water Base. Keep Watermancer's guided order as Set ionic target → Add waters → Add salts → Choose matching strategy → Auto-match → Review match.