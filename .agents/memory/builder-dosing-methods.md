---
name: Builder dosing methods
description: The Builder presents dry-salt and dropper-stock workflows without changing the shared chemistry calculations.
---

The Builder’s dosing method switcher is a UX layer: Dropper Stocks is the beginner default and the live recipe cockpit shows batch drop counts immediately. Dry Salt Direct keeps scale-based recipe amounts primary. “Make this water” opens a checklist, while concentrate preparation remains available in the vault.

**Why:** Beginners need a friendly path from exact salt calculations to repeatable drop dosing, but the established ion, hydration, source-water, and correction engine must remain authoritative.

**How to apply:** Add future dosing formats as presentation/profile layers. Keep their values derived from the existing salt targets and selected hydration forms; do not introduce separate chemistry formulas or unverified commercial-product mappings implicitly.