---
name: Large JSX patch boundaries
description: Safe editing guidance for the calculator's large App.tsx JSX tree
---

When editing the large calculator component, patch JSX wrapper boundaries with unique nearby context instead of generic fragment or map-closing patterns.

**Why:** Repeated `</>`, `</div>`, and mapped-row boundaries are common in App.tsx, so a broad replacement can silently alter an unrelated component and create parser failures far from the intended edit.

**How to apply:** Anchor changes to distinctive labels, component names, or the specific table section; run typecheck immediately after structural JSX edits before making visual conclusions.