---
name: Watermancer result follow mode
description: The automatic-match ion result must use viewport anchoring for reliable follow-screen behavior.
---

Watermancer’s automatic-match result uses a fixed viewport presentation when follow mode is enabled, and normal document flow when docked.

**Why:** CSS `position: sticky` was unreliable in the calculator’s nested layout and made the result appear not to follow during scrolling.

**How to apply:** Preserve the follow/docked toggle state as UI-only; if the result card layout changes, keep follow mode viewport-anchored rather than reintroducing ancestor-dependent sticky positioning. When follow mode exposes left/right dock controls, retain the selected dock across follow toggles. Keep the centered follow card height-limited on phones and let its ion rows scroll internally so it remains useful while editing the underlying recipe.