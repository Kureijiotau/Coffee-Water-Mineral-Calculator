---
name: Watermancer rail transition
description: Workflow rail starts inline and becomes right-side sticky only after scrolling past its original position
---

On wide screens, keep the Watermancer workflow rail inline at the top of the page. Once its original position scrolls out of view, pin it as a right-side vertical rail; scrolling back above that trigger restores the inline layout. Keep it inline on smaller screens.

**Why:** The rail should be discoverable in context without permanently occupying the right side when the user is at the top of the workflow.

**How to apply:** Preserve the original-position trigger and responsive desktop-only pinning when changing the rail or page layout.