# Account Sync In-Flight Change Preservation

**Status:** Design for review  
**Date:** 2026-10-01

## Problem

`AccountSyncProvider` allows only one request per account at a time. If a profile is deleted while a request is in flight, another `runSync()` call currently returns the existing promise without guaranteeing another pass. The first request can finish with a snapshot taken before the deletion and write that older profile collection back to local storage. The API replaces the account's profile arrays, so the stale write can also restore the deleted profile remotely.

The profile merge already preserves a local deletion when its baseline contains the deleted profile. The gap is that changes made after the request's local snapshot are not rebased onto the response, and a sync trigger during an active request can be lost.

## Goals

- Keep profile additions, edits, and deletions made during a request.
- Ensure a sync request received during an active request leads to a fresh pass.
- Keep account writes single-flight and collapse repeated triggers during one pass.
- Do not change the API schema or persisted data format.

## Non-goals

- Introduce deletion tombstones or change offline conflict policy.
- Refactor unrelated profile synchronization or account data.

## Design

Each sync pass captures its local data and baseline before reading or saving account data. When the server returns, the provider reads local data again and rebases changes made during the request onto the returned account snapshot, using the captured local data as the merge baseline. This keeps a late local deletion in the local state instead of applying a stale server response over it.

The returned server snapshot becomes the new sync baseline. If the rebased local data differs from the returned server data, or a sync trigger arrived while the request was active, the provider starts another pass using the current local data and the new baseline. Repeated triggers coalesce into one pending pass; changes or triggers during that pass can request another pass. A bootstrap `localOverride` applies only to the first pass so later passes read current storage.

The provider continues to check the active account scope before and after requests. If a request fails, it leaves the latest local state intact and uses the existing sync error and retry behavior. It must not write the older request snapshot over local data.

## Verification

- Use a deferred account-save response to reproduce the race: start with a saved profile, start a sync, delete the profile while the request is pending, then resolve the older response. Verify the profile stays absent from local state and is omitted from the follow-up account payload.
- Verify multiple sync triggers during one request cause one follow-up pass rather than parallel writes or lost work.
- Verify a further edit during the follow-up is preserved in another pass.
- Verify unrelated remote additions and late local changes to other account-synced data are retained.
- Verify account switching still prevents a prior account's result from being written into the new account scope.