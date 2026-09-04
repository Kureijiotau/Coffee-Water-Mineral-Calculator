---
name: Finished-water export readings
description: Why recipe exports need final ion readings instead of only salt targets
---

Salt targets by themselves do not identify a finished water recipe because the base-water contribution is missing. Mixer imports must prefer embedded finished-water readings, and current Alchemist/Watermancer exports must include them. Older salt-only files can only be labeled as estimates unless the user supplies the original base-water readings.

**Why:** A recipe card can visibly show calcium, bicarbonate, and other ions contributed by a source water even though its legacy embedded payload contains only the salts.

**How to apply:** Preserve target-profile data separately from finished readings. Use finished readings for Mixer snapshots; never silently present a salt-only RO estimate as the exact card result.

Legacy salt-only payloads need migration at every Mixer source boundary, not only during fresh file import, because imported snapshots, saved plans, profiles, and Mixer recipes can all preserve the old incomplete reading.

**Why:** Fixing only the parser leaves previously persisted source objects able to reintroduce the same incorrect zero calcium and bicarbonate values.

**How to apply:** Normalize legacy snapshots when loading storage and again when composing the Mixer picker; preserve already-correct finished readings and collapse the migrated duplicate.