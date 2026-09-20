---
name: Recipe-card salt import boundary
description: Rules for restoring Watermancer salts from structured or Gemini-read recipe cards
---

Only explicit, readable salt rows may update Watermancer salt selection or hydration forms. Final ion readings are target/profile data and must never be reverse-engineered into salt choices.

**Why:** A finished ion profile can be produced by many different salt combinations, so inferring salts would silently change the user's recipe and may select the wrong hydration forms.

**How to apply:** On import, restore positive explicit salt targets and their forms; when explicit salt rows are absent or unreadable, preserve the current salt rows and Used/Not used inventory while still allowing final-ion target import.