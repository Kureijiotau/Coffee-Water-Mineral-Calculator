---
name: Mixer picker cleanup
description: Mixer finished-water cleanup must not delete the source sessions or profiles that feed the picker.
---

The Mixer should treat saved Alchemist sessions and Watermancer profiles as reusable source records, not Mixer-owned recipes. Removing finished-water entries from the Mixer should hide the current source IDs in Mixer-local storage and clear Mixer-local imported/blend snapshots, while preserving the original sessions and profiles for their native workflows.

The first-open cleanup is a one-time migration for Mixer-owned imported and blended snapshots only. It must not hide parent-provided saved sources or rerun when new sources or recipes appear later.

Group finished Mixer sources by origin: Watermancer profiles and sessions, Alchemist sessions and saved salt recipes, and built-in recipes. Prefer stored finished-water readings for salt recipes; otherwise calculate from recorded source waters and salt targets, and label salt-only baseline calculations as estimates. Suppress a built-in only when its name and every final ion value exactly match a Watermancer source. Keep Mixer-owned blends in their own group.

**Why:** The Mixer picker is populated from multiple storage collections, so deleting its visible entries directly can unintentionally erase reusable Watermancer and Alchemist work.

**Why:** A reactive cleanup can hide a profile saved before a user's first Mixer visit and can erase a Mixer recipe saved during that first visit.

**How to apply:** Run legacy cleanup once from the initial Mixer state, mark it complete even if there is nothing to clean, and only clear Mixer-local imported/blend snapshots. Never use the migration to hide parent-provided profiles or plans.

**Why:** A flat picker obscures recipe origin, and removing every built-in would discard unique recipes while keeping exact duplicates would clutter the list.

**How to apply:** Keep the source groups distinct and alphabetize within each group. Only deduplicate built-ins against Watermancer sources when both the name and final ions match exactly.