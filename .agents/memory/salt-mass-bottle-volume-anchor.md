---
name: Salt-mass bottle-volume anchor
description: Salt edits in concentrate bottles preserve stock strength and scale bottle volume and all salt masses proportionally.
---

In the Separate salts concentrate strategy, when a user edits one physical salt amount in a bottle, keep the displayed stock strength fixed and scale that bottle's volume by the edited/current mass ratio. The other strategy modes do not expose this editor.

**Why:** Users may be unable to weigh the exact calculated mass but still want to prepare the same-strength individual stock from the amount they can measure; applying this to shared AIO or GH + KH bottles could create confusing UX and coupling.

**How to apply:** Treat salt-mass editing as a bottle-volume anchor, not a strength adjustment. Clear the anchor when strength or bottle volume is edited manually, and keep it mutually exclusive with the physical-salt-per-drop anchor.