---
name: Builder dosing methods
description: The Builder presents dry-salt and dropper-stock workflows without changing the shared chemistry calculations.
---

The Builder’s dosing method switcher is a UX layer: Dropper Stocks is the beginner default and the live recipe cockpit shows batch drop counts immediately. Its Mineral Pantry uses reusable fixed-strength 5% stocks in user-supported 60/100 mL bottles, with optional calcium; when calcium is unavailable, Epsom is increased to preserve GH while accepting a more magnesium-forward balance. Dry Salt Direct remains the advanced fallback. “Make this water” reveals only a choice, pantry prep, or dosing stage.

**Why:** Beginners need a friendly path from exact salt calculations to repeatable drop dosing, but the established ion, hydration, source-water, and correction engine must remain authoritative.

**How to apply:** Add future dosing formats as presentation/profile layers. Keep the default Builder minimal and progressively disclose pantry instructions only after the user chooses to make water. Let users choose supported container sizes and skip unavailable optional salts with an explicit sensory note. For calcium substitution, preserve GH using the shared CaCO₃ factors and salt ion fractions, then disclose the changed Mg:Ca balance. Keep drop counts derived from the effective salt targets and selected hydration forms; keep pantry stock strength independent from the current recipe. Do not introduce separate chemistry formulas or unverified commercial-product mappings implicitly.