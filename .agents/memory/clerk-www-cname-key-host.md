---
name: Clerk CNAME host normalization for www
description: Host-derived Clerk keys must match the verified custom Frontend API CNAME exactly.
---

When a production site uses `www.example.com` but its verified Clerk Frontend API CNAME is `clerk.example.com`, normalize the browser hostname and API session-key host by removing the leading `www.` before calling Clerk's host-derived publishable-key helper. Otherwise the helper derives `clerk.www.example.com`, which does not match the configured CNAME.

**Why:** The sign-in UI can render its fallback shell while Clerk never initializes against the intended Frontend API host.

**How to apply:** Confirm the exact verified CNAME and the app's canonical hostname before changing host derivation. Normalize only the known alias prefix for key derivation; keep any proxy URL based on the original request host, and do not modify Clerk key values or proxy settings.