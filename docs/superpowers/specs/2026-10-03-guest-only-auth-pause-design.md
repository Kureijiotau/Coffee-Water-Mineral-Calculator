# Guest-only app while sign-in is paused

## Goal

Temporarily make Watermancer usable only as a guest-local app. Visitors should enter the calculator without a sign-in prompt, and app features should not read or write account-sync data.

## User-visible behavior

- The calculator opens directly at the app root. Sign-in, sign-up, user-portal, sync-status, and sign-out UI are unavailable.
- Unknown paths, including old sign-in and sign-up URLs, return to the calculator.
- Saved data continues to use the guest browser-storage namespace.
- The tasting deletion confirmation describes local saved records and no longer promises cross-device syncing.

## Data and account boundary

- Explicitly clear the client-side account storage scope before the app mounts. Guest mode must use unsuffixed guest storage keys, even during development hot reloads.
- Do not copy account-scoped browser data into guest storage. It remains untouched and hidden while sign-in is paused.
- Do not delete or modify server-side account records, revoke sessions, or alter Clerk tenant configuration.
- Retain Clerk server middleware, proxy routes, account-sync API endpoints, and sync implementation as dormant infrastructure so sign-in can be restored later.

## Implementation shape

- Remove Clerk initialization and auth routes from the web app entry point while retaining the existing router and React Query provider.
- Stop wrapping the calculator in `AccountSyncProvider`.
- Remove auth and account-sync hooks and controls from the calculator header, plus client listeners that only refresh views after remote account changes.
- Leave the server and account data schema unchanged.

## Verification

- Run the calculator package typecheck, unit tests, and production build.
- Confirm the root calculator loads, sign-in and sign-up URLs redirect to it, and no sign-in, sync-status, or sign-out controls render.
- Confirm account data remains untouched; guest-mode reads and writes continue through the guest storage namespace.

## Re-enabling sign-in

Restore the Clerk web provider, auth routes, account-sync provider, remote-change listeners, and account controls. No server-side account data migration is required.