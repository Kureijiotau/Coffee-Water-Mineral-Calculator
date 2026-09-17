---
name: Mixer picker cleanup
description: Mixer finished-water cleanup must not delete the source sessions or profiles that feed the picker.
---

The Mixer should treat saved Alchemist sessions and Watermancer profiles as reusable source records, not Mixer-owned recipes. Removing finished-water entries from the Mixer should hide the current source IDs in Mixer-local storage and clear Mixer-local imported/blend snapshots, while preserving the original sessions and profiles for their native workflows.

**Why:** The Mixer picker is populated from multiple storage collections, so deleting its visible entries directly can unintentionally erase reusable Watermancer and Alchemist work.

**How to apply:** Keep picker cleanup scoped to Mixer-local state and persistent hidden-source IDs; do not clear the global Watermancer profile or Water plan collections.