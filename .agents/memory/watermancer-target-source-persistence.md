---
name: Watermancer target source persistence
description: Remember the last selected Watermancer ion target source across refreshes.
---

Persist the Watermancer target-source selector independently from chemistry settings, restoring the last valid source on startup and falling back to the safe profile if a saved source was deleted.

**Why:** Refreshing the app should not silently switch the user's selected target profile back to the default.

**How to apply:** Save changes with the existing debounced local-storage persistence pattern; validate saved-profile IDs when the saved profile catalog loads.