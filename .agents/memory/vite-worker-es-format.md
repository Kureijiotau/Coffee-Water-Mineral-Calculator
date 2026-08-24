---
name: Vite worker ES format
description: Vite workers that import code-split application modules require ES output format
---

When a browser worker imports an application module that participates in Rollup code splitting, configure Vite's worker output as ES modules.

**Why:** Vite's default IIFE worker format cannot be emitted when the worker dependency graph needs multiple chunks, causing production builds to fail even though development can start.

**How to apply:** Set the artifact's Vite worker format to `es` and re-run the production build after adding `new Worker(new URL(...), { type: 'module' })`.