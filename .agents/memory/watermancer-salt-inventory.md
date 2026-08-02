---
name: Watermancer salt inventory
description: The durable meaning of salt availability and dosing modes in Watermancer matching
---

Watermancer treats the salt inventory as the source of truth for salt participation:

- **Unavailable** salts contribute nothing.
- **Auto-dose** salts are optimized together by the existing matcher.
- **Fixed dose** salts contribute their entered amount and are held constant while auto-dose salts are optimized.

**Why:** A repeated salt-option list made availability ambiguous and allowed recipe-row values to leak into Watermancer matching even when the user had not selected those salts.

**How to apply:** Keep future Watermancer UI and solver changes expressed through these inventory modes; do not silently fall back to the Brewer/Alchemist recipe rows.