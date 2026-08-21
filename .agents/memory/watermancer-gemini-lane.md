---
name: Gemini chemistry lane
description: Decision for evaluating a modern chemistry-aware Watermancer matcher without destabilizing the established route solver
---

The Gemini chemistry lane must remain an additive, deterministic local ranking path. It may reuse the established route sweep and salt solver, but it must return an isolated preview and require explicit user confirmation before applying a route.

**Why:** The established matcher is already relied on by the product, while modern chemistry heuristics are sensory/profile-dependent and need side-by-side evaluation before replacing anything.

**How to apply:** Keep the existing match action and state untouched. Add new policy fields and regression fixtures in the alternate module, and expire its preview whenever Watermancer inputs change.