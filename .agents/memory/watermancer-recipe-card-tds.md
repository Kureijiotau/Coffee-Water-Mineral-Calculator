---
name: Watermancer recipe-card TDS
description: Keep recipe-card TDS aligned with Watermancer dose overrides in salt-only batches
---

Recipe-card TDS must be calculated from the effective Watermancer salt-dose map, not from the general recipe-row map. Watermancer direct doses are stored as physical-dose overrides and can be nonzero while the legacy salt rows remain blank.

**Why:** Salt-only Watermancer cards previously displayed 0 ppm in the verification target because that path fell back to the legacy row targets whenever no bottled water was selected, even though the card’s ion analysis used the active Watermancer doses.

**How to apply:** Use one modeled ion-total calculation for both the recipe-card verification TDS and final mineral-analysis TDS. Add bottled-water ions and dilution only when configured source water is present. This TDS is the summed modeled ion ppm, not a conductivity-meter reading.