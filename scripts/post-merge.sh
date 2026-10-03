#!/bin/bash
set -euo pipefail

if git rev-parse --verify HEAD^ >/dev/null 2>&1; then
  changed_files="$(git diff --name-only HEAD^ HEAD)"
else
  changed_files="$(git ls-files)"
fi

if printf '%s\n' "$changed_files" | grep -Eq '(^|/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|\.npmrc)$'; then
  pnpm install --frozen-lockfile
else
  echo "No dependency manifest or lockfile changes; skipping pnpm install."
fi

if printf '%s\n' "$changed_files" | grep -Eq '^lib/db/(src/schema/|drizzle\.config\.ts$|package\.json$)'; then
  pnpm --filter @workspace/db run push-force
else
  echo "No database schema changes; skipping Drizzle schema sync."
fi
