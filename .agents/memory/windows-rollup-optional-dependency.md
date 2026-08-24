---
name: Windows Rollup dependency
description: Cross-platform pnpm CI behavior for Rollup's optional native package
---

When a pnpm lockfile is generated on Linux and the workspace excludes optional
platform packages, Windows CI can fail before tests with a missing
`@rollup/rollup-win32-x64-msvc` module. Keep the matching Windows Rollup binary
explicitly locked for Windows builds.

**Why:** Frozen installs resolve from the committed lockfile and do not
reliably add a platform-specific optional package that was omitted during a
Linux lockfile generation.

**How to apply:** When adding or updating Vite/Rollup tooling used by Windows
CI, verify the Windows native package is present in the lockfile and run the
same frozen install on a Windows runner.