---
name: Vercel static assets
description: Keep Vite-imported image assets available to Vercel's Git-based production builds.
---

Static assets imported by the Vite app must exist in the pushed Git tree. Replit's global ignore rules exclude `attached_assets/*`, so a workspace can build successfully from local files while Vercel's checkout fails with `ENOENT`. A broad cleanup of attached files can silently remove production image dependencies.

**Why:** Vercel builds from committed source, not the local Replit workspace. The global ignore rule can hide still-needed assets from Git status and make deployment failures appear unrelated to the code change that triggered a build.

**How to apply:** Before diagnosing a new frontend build error, compare missing imports with the last successful deployment's Git tree. Keep only app-used static assets trackable, and verify with the same API-package plus Vite production build command Vercel uses.
