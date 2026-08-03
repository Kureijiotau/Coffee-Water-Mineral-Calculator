---
name: Attention animation dismissal
description: Interactive nudges should stop after the user acts or the prompted state is achieved, with reduced-motion support.
---

Attention animations are appropriate for directing first-time action, but should stop after the user clicks the action or the underlying state shows the action has already been completed. Preserve the control’s normal usability after dismissal and disable the animation for users who prefer reduced motion.

**Why:** Repeating motion after the user has acted becomes distracting and can make the interface feel unresolved.

**How to apply:** Use a local dismissed/seen state for one-session prompts, and pair every new attention animation with a `prefers-reduced-motion: reduce` override.