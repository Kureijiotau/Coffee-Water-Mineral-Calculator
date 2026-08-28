---
name: WATER recipe files
description: File naming and compatibility rule for exported coffee-water recipes
---

Recipe exports use the distinctive `.WATER.png` filename, with an uppercase `.WATER` segment and a final `.png` extension for reliable desktop and mobile image previews. The PNG contains standard JSON in a Watermancer `iTXt` metadata chunk. Recipe importers must parse that metadata and also accept plain `.WATER` and legacy `.json` files.

**Why:** The `.WATER` segment makes recipe files recognizable in a downloads folder while the final `.png` extension gives operating systems a reliable image icon and preview without introducing a new data format.

**How to apply:** Use `.WATER.png` for recipe exports, set the file MIME type to `image/png`, embed the JSON in valid PNG metadata, and include `.WATER`, `.water`, `.WATER.png`, `.water.png`, `.json`, and PNG image types in recipe file-picker filters.