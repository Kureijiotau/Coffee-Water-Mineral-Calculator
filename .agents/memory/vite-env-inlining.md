---
name: Vite env var inlining
description: Rules for VITE_* env vars to be inlined correctly in production builds
---

## Vite only inlines `import.meta.env.VITE_*` with dot notation

In Vite's production build (`vite build`), environment variables prefixed with `VITE_` are **only inlined at compile time when accessed with dot notation**:

```typescript
// ✅ Works in production — Vite replaces this with the string value
const url: string = import.meta.env.VITE_API_URL ?? '';

// ❌ NOT inlined in production — passes through as-is, returns undefined
const url: string = import.meta.env['VITE_API_URL'] ?? '';
const url: string = (import.meta.env as any)['VITE_API_URL'] ?? '';
```

The dev server handles both forms, so this only surfaces when deploying.

## TypeScript declarations

To use dot notation without TS errors, augment `ImportMetaEnv` in `vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}
```

## Vercel builds

`VITE_*` vars must be set as **build-time environment variables** on Vercel (project Settings → Environment Variables). Vercel exposes them to builds by default, so after setting them, a fresh deploy inlines the value.
