---
name: Vite worker ES format
description: Vite workers that import code-split application modules require ES output format
---

When a browser worker imports an application module that participates in Rollup code splitting, configure Vite's worker output as ES modules. Keep that worker path disabled in Vite development when the imported module is a React-refresh-transformed TSX root.

**Why:** Vite's default IIFE worker format cannot be emitted when the worker dependency graph needs multiple chunks, and React Refresh injects `window`-dependent code into TSX modules that cannot run inside a worker.

**How to apply:** Set the artifact's Vite worker format to `es` and re-run the production build after adding `new Worker(new URL(...), { type: 'module' })`. Until the computation is extracted into a React-free module, use the synchronous fallback in development.