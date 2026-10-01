# Use the verified Clerk Frontend API domain directly

## Goal

Restore Production sign-in and account sync without relying on a Clerk proxy URL that the Clerk Dashboard cannot validate.

## Decision

The browser will contact the verified Clerk Frontend API hostname, `clerk.watermancer.quest`, directly. The `ClerkProvider` will no longer receive `VITE_CLERK_PROXY_URL`. Before deriving the Clerk key in the browser or API session middleware, strip an optional leading `www.` so `www.watermancer.quest` resolves to the verified CNAME instead of `clerk.www.watermancer.quest`. Keep the API proxy URL based on the original request host; the proxy server route can remain available but will not be used by the browser.

This uses Clerk's standard custom Frontend API CNAME path. Live checks confirmed that the custom hostname serves `/v1/environment` successfully and permits requests from `https://www.watermancer.quest`. The current proxy endpoint returns `host_invalid`, so do not add more production proxy configuration.

## Validation

- Run the calculator package typecheck and production build.
- Confirm the production sign-in page at `www.watermancer.quest` renders Clerk's sign-in form and the custom Frontend API remains reachable.
- After a user signs in on Production, verify an authenticated `/api/account/sync` request succeeds and do not print keys, cookies, or database credentials.

## Scope

Change only the browser's Clerk proxy setting and production hostname normalization. Do not change Clerk credentials, database schema, or account-sync API behavior.