# Account Sync for Saved Profiles and DIY Concentrate Inputs

## Goal

Let a user sign in on different devices and access the same custom Alchemist profiles, Watermancer target profiles, and DIY Concentrate inputs. Keep the calculator usable without an account.

## Scope

Included:

- User-created Alchemist ion-range profiles.
- User-created Watermancer ion-target profiles.
- The remembered inputs in the DIY Concentrate workspace, including stock and batch quantities, calibration values, target/dose values, and dose basis.
- Optional account sign-in, sign-up, and sign-out.
- Import and merge of existing browser-local data when a device first signs in.

Excluded:

- Built-in profiles, which remain bundled with the app.
- Recipe Concentrate plan settings, saved recipes, Water Plans, community waters, and other calculator preferences.
- Real-time collaborative editing or account/team sharing.

## Architecture

- Use Replit-managed Clerk for account identity. The project currently has no Clerk setup.
- Keep sign-in optional; anonymous calculator use continues to work.
- Add a small account control to the app shell and themed sign-in/sign-up routes.
- Add a user-owned record to the existing PostgreSQL/Drizzle database. It holds the two profile collections and the DIY Concentrate input object as JSONB, plus an update timestamp.
- Add authenticated API read/write operations. The server derives the account ID from the verified Clerk session; clients cannot select or read another account's record.
- Keep local persistence for responsive, offline use, but scope local cached data by account so signing out or switching accounts cannot expose one account's data to another.

## Sync and migration behavior

1. On sign-in, load the account record.
2. On that device's first sync, merge local custom profiles into the account by profile ID. Independent profiles are preserved and duplicates are not created. Built-in profiles are never uploaded.
3. If the account has no DIY input record, seed it from that device's local DIY inputs. Otherwise, the account's existing DIY inputs are authoritative on sign-in.
4. Save local edits immediately and send account updates automatically. Fetch the account record on sign-in and when returning to the app; no live socket sync is required.
5. If two devices save conflicting changes to the same profile, the latest successful save wins. Independent profile additions are merged.
6. Preserve local edits if the API is unavailable. Show a clear unsynced/error state and retry on reconnect or the next app visit; never report an unsaved change as synced.

## Security and environments

- Protect account data routes with Clerk middleware and require an authenticated user.
- Validate the JSON payloads before storing them and scope every database read/write to the verified user ID.
- Development and published Clerk environments have separate account stores; preview accounts do not automatically exist in production.

## Verification

- Unit-test profile merge behavior, duplicate prevention, first-sign-in import, and DIY cloud-versus-local precedence.
- Test API rejection for signed-out requests, account isolation, payload validation, and read/write behavior.
- Browser-test that anonymous use remains intact, sign-in state is clear, saved data survives refresh, and another signed-in device receives the account data.
- Confirm failed remote saves retain local data and display a retryable sync state.