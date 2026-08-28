---
name: Watermancer transient ion tray
description: Show recently affected final-ion rows in a temporary bottom tray while editing Watermancer inputs.
---

Watermancer’s final ion-reading rows are shared between the full result card and a transient bottom-of-viewport tray. The tray shows the nonzero active ions affected by the latest salt or water interaction, resets its inactivity timer while editing continues, and disappears after roughly three seconds.

**Why:** The PiP/follow-screen result duplicated too much UI and made editing feel disconnected from the source control. A small, temporary view keeps feedback close to the viewport without changing the normal result-card layout or chemistry calculations.

**How to apply:** Keep the full Final ion readings card in normal document flow. Reuse its exact row renderer for the tray, spotlight only active ion IDs, reset the timer on every stepper click, direct-dose edit, salt enable, or water addition, and honor `prefers-reduced-motion`. Do not reintroduce PiP controls, dock-position state, or compact-on-scroll behavior unless the interaction model is deliberately redesigned again.