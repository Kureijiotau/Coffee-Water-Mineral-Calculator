---
name: Saved water picker
description: Idempotent behavior for saved and community water selection
---

The saved-water picker is idempotent: selecting a saved water that is already present in the mineral-water list must leave the list unchanged rather than append another entry. Saved profiles carry their identity into the active entry, whose ion fields stay locked until an explicit Edit action. New picker-created entries may carry the saved-water identity, while name and ion-profile matching preserves this behavior for older entries without that identity.

**Why:** Repeated clicks on a saved water previously created duplicate source entries and made the water list grow unexpectedly; unlocked saved ions also made accidental recipe changes too easy.

**How to apply:** Keep duplicate prevention at the mineral-water state-update boundary, not only in the click handler, so rapid repeated clicks are safe. Lock ion inputs for entries linked to saved profiles, and have Edit unlock them until Save changes or Cancel edit. Do not apply this guard to the manual “Add water source” action or to intentionally distinct comparison-water additions.