---
name: Silica target scope
description: Product boundary for editable Watermancer targets and Use/Not used behavior.
---

Watermancer's new editable target and Use/Not used workflow applies only to the silica supplement; do not generalize it to other ions or salts without explicit direction. When silica is Used, its target controls the nearest-whole-drop dose; when Not used, it remains on the existing manual-dose path.

**Why:** The user explicitly narrowed the requested controls to silica only and chose target-driven dosing for silica.

**How to apply:** Keep silica-specific state, controls, dose calculations, and persistence isolated from core-ion targets and salt selection. Preserve existing behavior for every other ion and salt.

Whenever silica drops are nonzero, show Silica as its own row on the recipe card and give it a distinct violet accent; omit the row when no silica is used.

**Why:** The user explicitly asked for Silica to appear on the recipe card whenever it is used and to have its own color.

**How to apply:** Use the same positive-drop condition as the existing Silica dose and keep the unique accent consistent in recipe-card exports.