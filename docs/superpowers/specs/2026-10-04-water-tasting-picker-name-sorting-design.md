# Water Tasting Picker Name Sorting

## Goal

Make choices easier to find in the Water Tasting water-profile picker by sorting
every choice by name while retaining its Alchemist and Watermancer organization.

## User-visible behavior

- Keep the two existing groups, **Alchemist** and **Watermancer**, in that order.
- Sort every choice A–Z within its existing group, including saved and built-in
  recipes, profiles, and other water sources.
- Compare names case-insensitively with natural numeric ordering. Ignore the
  display-only `Recipe ·` and `Profile ·` prefixes when present, but leave the
  visible labels unchanged.
- Keep the original source order when two choices have equal names.

## Data and behavior boundaries

- Sorting is presentation-only. Do not change source IDs, readings, or how the
  selected source is resolved.
- Sort a display copy of the choices so the option builder's source order and
  other consumers remain unchanged.
- Include any temporary unavailable choice shown while editing an older tasting.
- Do not change tasting history sorting, saved records, storage, or sync payloads.

## Verification

- Add unit coverage for within-group name order, case-insensitive natural
  comparisons, ignored display prefixes, stable ties, and preserved groups and
  source identities.
- Run the focused Water Tasting tests, package typecheck, and production build.
- Confirm the picker still shows the two groups and that selecting an entry
  resolves to its original source.