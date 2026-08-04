---
name: Preview and live database separation
description: Preview and published Watermancer deployments can use different Postgres databases and catalogs.
---

The preview and published calculator do not automatically share community-water data. Treat live and preview catalogs as separate until their API responses are compared explicitly; synchronizing requires an intentional, deduplicated data copy or a shared database connection.

**Why:** A healthy API can still show different water lists when preview reads the Replit development database and the published site reads its own production database.

**How to apply:** Compare `/api/waters` in both environments before diagnosing missing records, and preserve existing live records when copying preview profiles.