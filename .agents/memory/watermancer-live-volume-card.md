---
name: Watermancer live volume result
description: Selected-route result cards must recalculate from edited visible water volumes.
---

Watermancer route application may initially fill selected waters, but subsequent volume stepper edits are user-controlled inputs and must recalculate the selected route card directly from those visible volumes.

**Why:** Re-running the water-filling strategy after every `−/+` click restored the solver’s prior volume and made the selected-route ion card appear frozen.

**How to apply:** Keep route kind as the selected strategy identity, disable route water filling for live result recalculation, and derive final ions from current water entries plus the selected route’s salt strategy. Keep the selected route’s salt targets fixed during this micro-adjustment preview so automatic salt compensation cannot hide a 1 mL water change.