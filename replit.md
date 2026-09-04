# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- Prefer that the agent inspect running pages, endpoints, logs, and deployment behavior directly instead of asking the user to verify them.
- Only ask the user to check something when it is genuinely inaccessible to the agent, such as a private dashboard control or one-time credential value.
- Do not push commits routinely; leave pushing to the user. Push only when an exceptional deployment or infrastructure issue makes a remote recovery point important.
- Avoid running full test, build, workflow restart, and preview checks after every small edit; use focused verification unless the change materially affects behavior or runtime.

## Gotchas

- Before syncing or pushing, run `git fetch origin --prune` followed by `pnpm run audit:sync`. The audit requires a clean tree, no merge conflicts, no unsupported lockfiles, and an exact match between local `main` and `origin/main`.
- The full workspace build requires `PORT=8081 BASE_PATH=/ pnpm run build` because the mockup preview artifact validates both values during Vite builds.
- Keep `origin/main` as the canonical upstream for local `main`; avoid rebasing or force-pushing a diverged branch without preserving a recovery ref first.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
