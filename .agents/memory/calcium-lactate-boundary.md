---
name: Calcium Lactate boundary
description: Calcium Lactate contributes calcium to the core model while lactate stays a display-only supplemental ion.
---

Calcium Lactate must remain split at the modeling boundary: its calcium contribution uses the normal `IonId` path, while lactate is calculated separately for display only.

**Why:** Lactate is useful context for a Calcium Lactate dose, but it is not part of the app's supported Watermancer targets, GH/KH calculations, Aiki monitoring, or route-ranking dimensions.

**How to apply:** Keep lactate out of `IONS`, `ACTIVE_ION_IDS`, target profiles, and solver inputs. Render it only when the current effective Calcium Lactate dose is positive, using the same effective dose map shown in the Watermancer recipe. Describe its sensory effect cautiously: subtle at typical coffee-water levels, possibly contributing rounded mouthfeel, with a faint tangy/sour edge only at higher levels.