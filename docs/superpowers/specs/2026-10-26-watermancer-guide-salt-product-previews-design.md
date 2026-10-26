# Watermancer Guide: Salt Product Image Previews

**Date:** 2026-10-26

## Goal

Help readers recognize the optional named salt examples in Step 2 without making the guide feel like a premium shopping list. Use restrained emphasis to make the main buying guidance easier to scan.

## Scope and behavior

- Add product-photo previews only to the named examples: Zechstein magnesium chloride, nigari, Saltverk, Vera Salt, and Arm & Hammer baking soda. Keep generic magnesium sulfate, calcium chloride, and potassium-salt examples as plain text.
- Style the named examples as low-key inline buttons with a subtle underline. Pointer hover and keyboard focus open a compact product card; tapping opens it on touch devices. The card includes an actual product photo, descriptive alt text, and a discreet link to its source.
- Emphasize only the key guidance—prefer the most hydrated common form, natural salts are an optional taste choice, and food-grade basics are enough—using the existing muted cyan/white palette rather than bright badges or large callouts.
- Load photos from public product pages rather than copying media into the project. Use lazy loading and suppress referrer details. Product photos illustrate examples, not endorsements.
- Do not show a Zechstein package marketed for bathing as a food-use recommendation. Use a photo only when the source clearly identifies a food-use product; otherwise keep that example as highlighted text and retain the food-grade reminder.
- Do not change the guide layout, salt calculations, or recipe behavior.

## Implementation and verification

- Keep product photo metadata and source links in one typed data module.
- Test that the named triggers, image descriptions, source links, and restrained emphasis are present.
- Verify pointer, keyboard, and touch behavior where the existing test setup supports it; run the artifact tests, typecheck, and production build.
