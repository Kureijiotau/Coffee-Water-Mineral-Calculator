---
name: React-free Watermancer solver
description: The route matcher must stay isolated from the React application so all environments can use the worker.
---

The Watermancer route solver and its pure calculation dependencies must remain in a React-free module consumed directly by both `App.tsx` and the worker.

**Why:** The matcher can take several hundred milliseconds; importing the React component into the worker forced a development-only synchronous fallback and made initial matching block the main thread.

**How to apply:** Keep UI state, rendering, and browser lifecycle code in `App.tsx`; put automatic route computation and shared pure input/output types in the worker-safe module, and preserve app re-exports only for compatibility.