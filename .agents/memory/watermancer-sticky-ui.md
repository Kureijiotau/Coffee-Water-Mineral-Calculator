---
name: Watermancer transient ion tray
description: Show recently affected final-ion rows in a temporary bottom tray while editing Watermancer inputs.
---

Watermancer’s final ion-reading rows are shared between the full result card and an optional transient bottom-of-viewport tray. The tray shows active ions affected by a positive dose change, resets its inactivity timer while editing continues, and disappears after roughly three seconds. Users can turn feedback off or enable the original fixed Follow screen behavior independently.

**Why:** The original PiP/follow-screen result is useful for users who want the live result always visible, while the feedback tray is a separate short-lived cue. They should be independent so users can use both at once.

**How to apply:** Keep the full Final ion-reading card in normal document flow unless the user enables Follow mode, which restores the fixed card with left/center/right dock choices and a compact-on-scroll summary. Reuse its exact row renderer for the tray, render the tray through a portal into `document.body` so card-level blur/overflow styles cannot contain it, size it to the calculator card’s max width, and use one full-width compact row per affected ion so labels and ppm values remain readable. Feedback is static with no animation; any real salt-dose or water-volume/ion-value adjustment in either direction should open it. Do not make Follow and feedback mutually exclusive.