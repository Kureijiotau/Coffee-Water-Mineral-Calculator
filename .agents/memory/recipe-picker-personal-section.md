---
name: Recipe picker personal section
description: How saved recipes and Watermancer profiles are grouped with catalog sources
---

User-owned recipes and Watermancer profiles share one personal picker section labeled “My saved profiles,” while built-in and published sources remain separate catalog sections.

**Why:** Users should never mistake their editable local items for read-only catalog recipes, and legacy target-source prefixes must not strand a saved profile in a catalog group.

**How to apply:** Build personal options from the saved collections rather than persisted picker categories; normalize a legacy `recipe:<profile-id>` source to `saved:<profile-id>` when it matches a saved Watermancer profile.

Items in the personal section remain deletable from either workspace picker; built-in and published catalog entries never expose deletion.

**Why:** A unified personal section should give users ownership of everything they saved without making shared catalog content appear editable.

**How to apply:** Use the selected `saved:` profile or saved-recipe ID for the delete action, confirm before removal, and reset any active source that points to the deleted recipe.