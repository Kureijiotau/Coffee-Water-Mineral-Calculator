---
name: Builder dosing methods
description: The Builder presents dry-salt and dropper-stock workflows without changing the shared chemistry calculations.
---

The Builder’s dosing method switcher is a UX layer: Dry Salt Direct keeps scale-based recipe amounts primary, while Dropper Stocks makes batch drop counts primary after the user marks the stocks ready. Concentrate preparation remains available in the vault.

**Why:** Beginners need a friendly path from exact salt calculations to repeatable drop dosing, but the established ion, hydration, source-water, and correction engine must remain authoritative.

**How to apply:** Add future dosing formats as presentation/profile layers. Keep their values derived from the existing salt targets and selected hydration forms; do not introduce separate chemistry formulas or unverified commercial-product mappings implicitly.