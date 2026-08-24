# Watermancer Windows desktop build

The desktop wrapper is intentionally thin: Electron hosts the existing Vite
renderer with Node integration disabled and context isolation enabled. Core
calculator features continue to run locally using the browser APIs already
used by the web app.

## Development

From this package directory:

```bash
pnpm run desktop:dev
```

This starts Vite on `127.0.0.1:3000` and opens it in Electron.

## Local packaged smoke test

```bash
pnpm run desktop:pack
pnpm run desktop:run
```

`desktop:pack` creates an unpacked desktop build in `dist/electron`.

## Windows installer

```bash
pnpm run desktop:build
```

This produces an x64 NSIS installer in `dist/electron`. A Windows runner is
recommended for the final build and smoke test. Linux cross-compilation may
require Wine and is not treated as a release validation environment.

## Offline-first scope

The Windows package is intended to be self-contained and offline-first. Core
calculator features, saved snapshots, recipe import/export, and image export do
not require the API server. Online community and assistant features are not
part of the desktop release scope.