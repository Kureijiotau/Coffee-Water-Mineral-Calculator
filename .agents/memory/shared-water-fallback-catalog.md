---
name: Shared water fallback catalog
description: Keep the public bundled water catalog synchronized with shared database entries.
---

The public API must include important shared water profiles in its bundled fallback catalog because the external deployment may not have a production database. Public water responses should normalize numeric ions and deduplicate identical name/profile pairs.

**Why:** The live deployment can be disconnected from the development database; without a bundled profile, a valid community water disappears when the API falls back or the production database is unavailable.

**How to apply:** When adding or correcting a shared water, update both the development data and `SHARED_WATERS`, and make `/api/waters` return a valid fallback response rather than a database error.