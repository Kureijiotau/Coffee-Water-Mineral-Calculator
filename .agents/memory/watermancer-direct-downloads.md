---
name: Watermancer direct downloads
description: Interaction rule for exporting Watermancer profiles on desktop and mobile
---

Watermancer profile export actions should download the `.WATER.png` file directly and must not invoke the browser’s native Web Share sheet.

**Why:** On mobile, the native share UI interrupts the user’s intended save action and asks for additional sharing choices instead of simply saving the profile.

**How to apply:** Keep export actions download-only. Preserve the image-backed PNG export and explicit JSON `.WATER` fallback, but do not add `navigator.share()` to the profile download path.