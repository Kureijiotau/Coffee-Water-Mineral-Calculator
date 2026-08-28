---
name: Watermancer transient ion tray
description: Show recently affected final-ion rows in a temporary bottom tray while editing Watermancer inputs.
---

Watermancer’s final ion-reading rows are shared between the full result card and an optional transient bottom-of-viewport tray. The tray shows active ions affected by a positive dose change, resets its inactivity timer while editing continues, and disappears after roughly three seconds. Users can turn feedback off or enable an optional sticky Follow mode on the card.

**Why:** The original PiP/follow-screen result duplicated too much UI and made editing feel disconnected from the source control. The redesigned controls preserve a small temporary view for users who want it, while Follow mode keeps the actual card in document flow and avoids running both views at once.

**How to apply:** Keep the full Final ion readings card in normal document flow unless the user enables Follow mode, which applies sticky positioning to the card. Reuse its exact row renderer for the tray, render the tray through a portal into `document.body` so card-level blur/overflow styles cannot contain it, size it to the calculator card’s max width, and use one full-width compact row per affected ion so labels and ppm values remain readable. Feedback is static with no animation; only positive dose changes should open it. Follow mode turns feedback off, and enabling feedback turns Follow mode off. Persist both preferences locally.