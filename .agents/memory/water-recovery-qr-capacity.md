---
name: WATER QR capacity
description: Constraints for keeping large recipe recovery and share-link QRs exportable
---

Both QR codes on a `.WATER.png` card carry the full encoded recipe, so either one can exceed QR capacity when a recipe has multiple source waters and many salt rows.

**Why:** The previous recovery QR duplicated a legacy recipe envelope around the complete share payload, and the HTTPS share-link QR also failed when it stayed at the strongest correction level. The result was the generic share-card export failure before rasterization.

**How to apply:** Keep the recovery QR payload as the complete encoded share payload without a duplicate envelope. Generate both recovery and HTTPS share-link QRs with adaptive correction levels, preferring H and stepping down through Q, M, and L only when capacity requires it.