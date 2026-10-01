# Watermancer Sync Profile Deduplication

## Goal

Keep the saved Watermancer target picker free of duplicates after every account
sync. Two profiles are duplicates when their names match exactly and their
target maps contain the same ion keys and values. Profile IDs, source
information, finished-water readings, and notes do not affect this identity.
Profiles with different names or different target maps remain separate.

## Current behavior

Account and first-device merges use `mergeWatermancerProfileCollections`, which
currently removes profiles only when all fields other than the ID match. The
clean incoming-profile refresh path in `App.tsx` can apply a list without using
that helper. Saved and recipe target-source IDs are currently remapped only
when every non-ID field matches.

## Proposed behavior

- Add one shared Watermancer profile identity comparison based on exact name
  and stable, key-order-independent target-map equality. An absent target key
  remains distinct from an explicit zero target.
- Deduplicate the ordered profile list at every account-sync boundary:
  first-device guest/account merge, normal remote merge and conflict retries,
  local persistence of synchronized data, and clean incoming-profile refresh.
- Keep the account/remote profile when a duplicate group contains one. The
  first-device merge must explicitly prioritize account IDs over guest copies;
  other ties keep the first occurrence. Replace the winner in the duplicate's
  existing picker position and do not merge metadata from the removed copy.
- Remap `saved:` and `recipe:` target-source references from a removed profile
  ID to the surviving profile ID before applying incoming profiles.
- Ensure a duplicate removed from the local merge is also absent from the
  account-sync payload, so a successful sync removes it from the remote list.

## Alternatives considered

1. **Deduplicate the synced data (recommended):** the picker and account record
   each contain one profile, and the duplicate does not return on a later sync.
2. **Hide duplicates only in the picker:** less data handling, but duplicate
   records remain in sync storage and can reappear after refresh.
3. **Keep comparing every profile field:** preserves metadata variants, but
   does not meet the requested same-name/same-target rule.

## Testing

- Verify first-device and normal account merges collapse duplicate names and
  target maps even when IDs or metadata differ.
- Verify same-name profiles with different targets and different-name profiles
  with identical targets remain separate.
- Verify account/remote metadata wins and saved/recipe target references point
  to the surviving ID.
- Verify clean incoming profile refreshes use the same deduplication rule.
- Run the calculator tests, type check, and production build.

## Scope

This change applies only to Watermancer target profiles. It does not alter
Alchemist profiles, target calculations, or solver behavior.