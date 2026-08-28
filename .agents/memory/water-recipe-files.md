---
name: WATER recipe files
description: File naming and compatibility rule for exported coffee-water recipes
---

Recipe exports use the distinctive uppercase `.WATER` extension, but the file contents remain standard JSON. Recipe importers must parse the file body and accept `.WATER` as well as legacy `.json` files.

**Why:** The custom extension makes recipe files recognizable in a downloads folder without introducing a new data format or breaking existing exports.

**How to apply:** Use `.WATER` for every recipe export path, keep `application/json` as the MIME type, and include `.WATER`, lowercase `.water`, and `.json` in recipe file-picker filters.