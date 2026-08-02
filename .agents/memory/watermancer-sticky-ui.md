---
name: Watermancer result follow mode
description: The selected-route ion result must use viewport anchoring for reliable follow-screen behavior.
---

Watermancer’s selected-route result uses a fixed viewport presentation when follow mode is enabled, and normal document flow when docked.

**Why:** CSS `position: sticky` was unreliable in the calculator’s nested layout and made the result appear not to follow during scrolling.

**How to apply:** Preserve the follow/docked toggle state as UI-only; if the result card layout changes, keep follow mode viewport-anchored rather than reintroducing ancestor-dependent sticky positioning.