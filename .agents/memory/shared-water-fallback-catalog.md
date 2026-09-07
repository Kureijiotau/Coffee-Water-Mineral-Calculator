---
name: Shared water fallback catalog
description: Keep the public bundled water catalog synchronized with shared database entries.
---

The public API must include important shared water profiles in its bundled catalog because development and production databases are intentionally separate. Public water responses should normalize numeric ions and deduplicate identical name/profile pairs, merging bundled profiles with database rows rather than requiring production seeding.

**Why:** The live deployment has its own newly provisioned database and may not contain development-seeded catalog rows; without merging bundled profiles, a valid curated water disappears even when the production database is healthy.

**How to apply:** When adding or correcting a curated shared water, update the development data and `SHARED_WATERS`; make `/api/waters` merge database rows with bundled rows, normalize them, and deduplicate exact name/profile matches.