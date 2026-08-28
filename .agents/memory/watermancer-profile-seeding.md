---
name: Watermancer profile seeding
description: Product rule for creating a saved Watermancer profile from the current mixture
---

When the user clicks Watermancer “Add new,” seed the editable profile ceilings from the live final-mixture ion readings shown in the final result section, not from the previous target profile or an input-only subtotal.

**Why:** Users may combine waters and salts, taste a result they like, and want to save those exact final ion readings as a reusable profile with no manual transcription.

**How to apply:** Keep this behavior limited to the new-profile draft path; preserve ordinary target editing and overwrite behavior. Use the same final-ion model as the visible final-mixture card, with only active core ions becoming profile targets.