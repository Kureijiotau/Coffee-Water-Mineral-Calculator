# Implementation Plan: Account Sync In-Flight Change Preservation

## Objective

Keep Watermancer profile deletions and other local edits made during an active account-sync request, then sync the latest state without launching concurrent account writes.

## Steps

1. **Add rebase helpers and focused merge tests**
   - Compare a captured account-local snapshot with the latest local data.
   - Rebase changes made after a request started onto its returned server snapshot, using the captured local data as the merge baseline.
   - Cover a late Watermancer deletion, unrelated remote additions, and late edits to other synchronized fields.

2. **Queue sync requests per active account**
   - Keep the current single-flight behavior, but record that another pass is needed when `runSync()` is called during an active request.
   - Consume a bootstrap `localOverride` only on the first pass; subsequent passes read current storage.
   - After each response, preserve any late local changes, store the returned server snapshot as the baseline, and repeat when local data still differs or another trigger arrived.
   - Retain the existing account-scope checks and error behavior.

3. **Add deterministic in-flight race coverage**
   - Use deferred promises to hold an account save open while a profile is deleted.
   - Resolve the stale response and verify the deleted profile is not written back locally and is absent from the follow-up save payload.
   - Verify repeated sync triggers coalesce, a later edit during the follow-up survives, and no two save requests are active at once.

4. **Verify the completed change**
   - Run the calculator test suite, typecheck, and production build.
   - Restart the web workflow once, inspect its logs, and confirm the preview still loads.

## Acceptance Criteria

- A profile deleted while account sync is in flight stays deleted in the same tab.
- The account receives the deletion in a follow-up write based on the current server revision.
- Concurrent triggers do not start parallel account writes and do not get dropped.
- Late changes to other synchronized data and unrelated remote additions are retained.
- Account switching continues to prevent a prior account's response from overwriting the new account scope.