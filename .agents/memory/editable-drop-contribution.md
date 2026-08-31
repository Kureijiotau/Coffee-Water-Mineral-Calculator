---
name: Editable drop contribution
description: The all-in-one concentrate can pin physical salt ppm per drop and solve stock strength around that target.
---

The all-in-one recipe's physical salt ppm per drop is an optional user control.
When pinned, preserve the recipe's salt proportions and bottle volume while
solving stock strength from the current final-water volume and active dropper
rate. Direct stock-strength edits clear the pin, and above-ceiling targets stay
exact with the existing safety warning rather than being silently clamped.

**Why:** Users need a stable per-drop dosing unit when batch volume or dropper
calibration changes, without changing the physical bottle recipe or hiding an
unsafe concentration.

**How to apply:** Keep the pin separate from the calculated readout, persist it
as an optional snapshot field, and use the inverse physical-mass calculation
instead of changing salt-equivalent or ion-target chemistry.