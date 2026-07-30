---
name: Ion profile view model
description: Ion Profile must distinguish the original salt recipe from the final mixture with configured base water.
---

The Ion Profile offers two explicit views: Salt only uses the original salt targets, while Base water + salts uses source-water-adjusted salt targets plus diluted configured-water ions. When configured water exists, the final-mixture view is the default.

**Why:** Users need to compare the recipe they designed with the chemistry they will actually brew; showing only one model makes base-water ion totals misleading.

**How to apply:** Keep the toggle local to the Ion Profile and source its final view from the shared adjusted-target/final-mixture calculation rather than recomputing a separate approximation.