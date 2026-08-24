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

## Online API features

The packaged renderer is built with `BASE_PATH=./` so local assets resolve from
the installed app. If online API features are needed in the installer, provide
`VITE_API_URL` during the build with the public API origin. Core calculator
features remain available without that setting.