---
name: Water recipe share and image import
description: Rules for share-link payloads and QR-versus-PNG metadata precedence.
---

Use a versioned compact share payload for recipe links, carrying salt rows, source-water entries, volumes, and final readings. Any payload with source waters opens Watermancer; salt-only payloads open Alchemist. PNG metadata is preferred only when the bytes have a real PNG signature; otherwise image imports must try the recovery QR before treating the file as text.

**Why:** PNG metadata is unavailable or unreliable after image services re-encode cards, while the QR remains portable. Source-water state must travel with the link so an import can restore the finished-water workflow rather than only its salts.

**How to apply:** Keep the raw `WMQR1:` recovery QR separate from the HTTPS share-link QR, and preserve browser-history cleanup after a successful or invalid share-link attempt.