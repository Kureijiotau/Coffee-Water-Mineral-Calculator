---
name: Mode switch reset boundary
description: Entering Brewer starts a lightweight default recipe and pauses Watermancer work without deleting persistent user preferences.
---

Switching into Brewer resets the active recipe workspace to the default flavor recipe, 1 L batch, no mineral/addition waters, and cleared Watermancer matching state. Saved recipes, profiles, calibration, community/local waters, and auto-fill preferences remain available. Watermancer solver and live-route work must stay paused outside Watermancer mode, and deferred matching callbacks must be invalidated when leaving it.

**Why:** Carrying a Watermancer source graph and solver result into the Brewer builder made mode switching sluggish and could let deferred work write stale results into the new mode.

**How to apply:** Keep this as a workspace boundary rather than a global reset. Any future expensive Watermancer action should check the mode generation before committing results.