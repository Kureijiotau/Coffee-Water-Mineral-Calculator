---
name: Touch long-press emulation
description: Limits of CDP touch-event emulation for native browser gestures in this workspace
---

CDP `Input.dispatchTouchEvent` produces touch and pointer events (`pointerType: touch`) and is useful for checking application-side tap and hold-repeat behavior. In the local Chromium environment, it did not produce the browser's native long-press text selection or context-menu gesture on ordinary text, even with mobile device metrics and a headful browser.

**Why:** A missing context-menu or selection event during CDP touch emulation is not proof that native mobile behavior is suppressed; the emulation layer may not synthesize those browser gestures.

**How to apply:** Use touch events to verify app-side button behavior, then separately verify selectable text with a real selection gesture and confirm context-menu cancellation on controls versus ordinary text. State this limitation when actual-device validation is still needed.