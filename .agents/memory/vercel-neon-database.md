---
name: Vercel Neon production database
description: Keep Vercel's Neon production database separate from Replit's development PostgreSQL.
---

The Vercel-hosted production API uses Neon for `DATABASE_URL` (confirmed by the user). The Replit development database and its schema pushes do not update Neon. Replit Publish does not deploy the Vercel app or migrate Neon.

**Why:** Production code and schema can otherwise diverge even when the Replit preview works.

**How to apply:** Treat production Neon changes as a separate, explicitly authorized migration. Never assume a successful Replit `db:push` changed Neon, and never request or echo the production connection string.