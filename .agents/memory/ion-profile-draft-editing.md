---
name: Ion profile draft editing
description: Ion target cards share one draft session so several values can be changed before one save.
---

Enter ion-profile editing when the user clicks any ion card. Preserve the same draft while the user moves between cards; Overwrite selected saves the complete draft once, and Cancel discards it.

**Why:** Requiring a save after every individual ion makes multi-value profile tuning unnecessarily repetitive and interrupts the editing flow.

**How to apply:** Keep card navigation inside the active draft session and do not reinitialize draft values when switching the focused ion.