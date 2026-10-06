---
name: Watermancer profile seeding
description: Product rule for creating a saved Watermancer profile from the current mixture
---

When the user clicks Watermancer “Add new,” seed the editable profile ceilings from the live final-mixture ion readings shown in the final result section, not from the previous target profile or an input-only subtotal. A separate action can overwrite a selected saved profile from those live readings; show it only when a valid final mixture differs from the saved targets at the displayed four-decimal precision, and confirm before saving. New users must not receive bundled saved Watermancer profiles; existing locally stored profiles remain selectable.

**Why:** Users may combine waters and salts, taste a result they like, and want to save those exact final ion readings as a reusable profile with no manual transcription. Stale finished readings would also make Mixer show an old result after a profile overwrite.

**How to apply:** Keep three operations distinct: new-profile seeding uses current final readings as a draft, edited-target overwrite saves the draft targets, and live-reading overwrite saves current final readings into both `targets` and `finishedIons` while preserving profile identity and descriptive metadata. Compare only active core ions, hide the live-reading action when no final mixture is available or the displayed readings match, and preserve existing local profiles.