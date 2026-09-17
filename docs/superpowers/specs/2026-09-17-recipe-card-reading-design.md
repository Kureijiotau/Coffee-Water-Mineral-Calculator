# Recipe Card Reading Design

## Status

Approved direction; implementation has not started.

## Goal

Let users import a recipe card image through the existing Import recipe controls. The importer should preserve every existing structured import path, recognize cards exported by this app when metadata or QR data is unavailable, and remove the visible share-link QR from exported cards because it adds visual clutter.

The first supported image source is a recipe card exported by this app. Arbitrary third-party recipe-card layouts are out of scope for the first implementation.

## User experience

1. The user selects a JSON, `.WATER`, PNG, WEBP, JPEG, or JPG file using the existing Import recipe control.
2. Existing deterministic import paths run first:
   - JSON and `.WATER` payload parsing.
   - Embedded PNG recipe metadata.
   - Recovery QR decoding.
3. If the image is an app-exported card without usable metadata or QR data, the importer attempts local card recognition.
4. If local recognition is incomplete or ambiguous, the image is sent through the dedicated recipe-card Gemini extraction path.
5. The active workspace determines which part of the candidate is applied:
   - In Watermancer, use the card's final ion readings as the ion-target input and preserve any available source-water details relevant to that target.
   - In Alchemist, use the recognized salt rows and hydration forms as the recipe input.
6. A structurally clear result may be applied automatically.
7. An uncertain result enters the existing pending import review flow, with warnings and the recognized values visible before the user applies it.
8. Existing legacy import behavior remains available and unchanged when the newer paths do not apply.

The visible share-link QR is removed from new exported cards. The app-facing recovery path and PNG metadata remain available so existing `.WATER.png` files continue to import.

## Active-workspace interpretation

The reader must not change tabs automatically. The user's active workspace determines the semantic interpretation of the same card:

- In Watermancer, the final mineral-analysis readings are the primary import. Map the card's calcium, magnesium, sodium, potassium, chloride, sulfate, bicarbonate, carbonate, and other modeled readings to the existing ion-target input where available. Mineral-water names and volumes may remain available as source context, but the card's final ion readings are what should be plugged into the Watermancer target model.
- In Alchemist, the salt rows are the primary import. Map each recognized salt amount and hydration form into the existing Alchemist recipe controls. Mineral-water rows are not converted into salts.
- A recipe containing both mineral water and salts is therefore valid in either workspace: Watermancer uses the final ion readings, while Alchemist uses the salts.
- If the active workspace cannot use the requested interpretation because required fields are missing, show the candidate in review with a clear explanation rather than switching tabs or silently dropping data.

Any informational copy should describe what was imported, not imply that the app changed workspace destinations. For example, when Alchemist imports a mixed card, explain that only its salt additions were applied; when Watermancer imports it, explain that the final ion readings were applied.

## Architecture

### Normalized import candidate

Introduce a single normalized candidate boundary for all recipe-card readers:

- Recipe name.
- Water sources:
  - Name.
  - Volume.
  - Ion profile when present.
- Salt rows:
  - Salt identity.
  - Amount.
  - Hydration form.
- Final ion readings when present.
- Detection source: metadata, recovery QR, local OCR, Gemini, or legacy parser.
- Field-level confidence.
- Warnings and validation errors.

The existing Watermancer and Mixer-specific conversion functions remain responsible for converting a valid candidate into their current state. The reader must not bypass those chemistry and state boundaries.

Add an active-workspace interpretation to the normalized import result:

- `alchemist-salts`: apply recognized salt amounts and hydration forms to Alchemist.
- `watermancer-ion-targets`: apply final mineral-analysis readings to Watermancer ion targets.

The interpretation must be selected before applying workspace state, so a mixed recipe is never silently converted from water ions into salts or vice versa.

### Staged reader

Create a focused reader module near the existing recipe image/import code. It should expose one image-reading entry point that runs the stages in order:

1. File format and embedded payload detection.
2. Recovery QR detection.
3. App-card local recognition.
4. Gemini fallback.
5. Candidate normalization and validation.

The reader must distinguish:

- `resolved`: safe for automatic application.
- `needs-review`: usable candidate with warnings or uncertain fields.
- `unsupported`: the image is not recognized as an app-exported recipe card.
- `failed`: decoding or service failure without a usable candidate.

### Local recognition

Local recognition is limited to the known exported-card structure. It should use stable section labels and known salt/ion vocabulary to identify fields, rather than attempting to interpret arbitrary recipe layouts. It should retain raw OCR text and per-token confidence internally so ambiguity can be reported without exposing implementation details in the UI.

Local recognition should preserve the original image bytes and MIME type for Gemini fallback, preferring PNG when the browser has already decoded or transformed the source into PNG.

### Gemini fallback

Use the existing Replit-managed Gemini integration boundary rather than asking users for a key or routing recipe cards through the bottled-water label extractor.

The recipe-card prompt must request structured JSON containing:

- Recipe name.
- Water steps and volumes.
- Every salt dose and hydration form.
- Final mineral analysis.
- Explicit `null` for values not visible or not confidently recognized.
- A short list of field-specific uncertainty reasons.

The prompt must state that this is an exported Coffee Water Calculator card and must not invent missing doses, waters, or ion values. The response is validated against the known salt and ion catalog before it becomes an import candidate.

## Confidence and application rules

The reader may auto-apply only when:

- A complete supported candidate is present.
- Every required field has acceptable local or Gemini confidence.
- Salt names and hydration forms map unambiguously to the app catalog.
- Volumes and doses are finite, non-negative, and use supported units.
- There are no conflicting duplicate rows.
- Any final-ion readings are structurally valid.

Any missing, ambiguous, unsupported, or contradictory field sends the candidate to review. Gemini confidence alone is never sufficient to silently accept an invented or unmapped value.

The review state should reuse the existing pending import pattern where possible. It must show the source of uncertainty and provide explicit apply/cancel actions. Applying a reviewed candidate must use the same state conversion functions as deterministic imports.

## Export changes

New recipe-card exports should:

- Remove the visible share-link QR and its label.
- Keep the app-facing recovery QR only if it remains part of the legacy recovery contract.
- Keep embedded `.WATER.png` metadata unchanged.
- Preserve existing export card dimensions and the Mineral analysis styling work.

No QR payload format, metadata envelope, or legacy decoder is removed in this feature. Existing cards remain importable.

## Error handling

- Unsupported image: explain that the reader currently supports cards exported by this app.
- Low-confidence read: show the candidate in review with highlighted uncertain fields.
- Active-workspace mismatch: explain which part of the card was applied when the card contains data that the current workspace intentionally does not use.
- Gemini unavailable or rate-limited: preserve the local candidate for review when one exists; otherwise show a retryable error and keep legacy import errors distinct.
- Invalid structured response: discard the invalid fields, report the validation issue, and never apply partially invented chemistry.
- Cancelled import: clear the pending candidate without changing the active workspace.

No image bytes or extracted recipe data should be persisted beyond the active import flow unless an existing save/import feature explicitly does so.

## Testing plan

### Unit tests

- Staged precedence: JSON, metadata, recovery QR, local recognition, then Gemini.
- Existing legacy payloads continue to parse.
- App-card OCR text maps known salts, hydration forms, units, and ion labels.
- Ambiguous digits, unsupported salts, missing volumes, and duplicate rows become `needs-review`.
- Gemini JSON validation rejects unknown salts and malformed numeric values.
- Clear candidates are eligible for automatic application; uncertain candidates are not.
- In Alchemist, salt-only and mixed cards apply their recognized salt rows.
- In Watermancer, salt-only and mixed cards apply their recognized final ion readings when present.
- Importing a mixed card never changes the active tab.
- Removing the share-link QR does not remove recovery QR or metadata import behavior.

### Integration tests

- Import a generated card after stripping PNG metadata and confirm the local reader path.
- Force local ambiguity and confirm the Gemini fallback request boundary.
- Import the same candidate into Watermancer and Mixer through the existing controls.
- Confirm review/apply/cancel behavior does not mutate workspace state prematurely.
- Confirm salt-only cards apply their salt rows in Alchemist.
- Confirm cards containing mineral water do not change the active tab.
- Confirm mixed cards apply salt rows in Alchemist and final ion readings in Watermancer.

### Browser verification

- Export a new recipe card and confirm only the intended recovery QR remains.
- Import the exported card with metadata intact.
- Import a rasterized copy with metadata removed.
- Confirm uncertain values are reviewable and clear values apply as designed.

## Scope boundaries

This feature does not:

- Read arbitrary external recipe-card designs in the first version.
- Replace or remove JSON, `.WATER`, metadata, QR, or legacy imports.
- Automatically modify chemistry targets based on an image.
- Automatically switch tabs based on detected recipe ingredients.
- Add share-link persistence or server-side recipe storage.
- Persist uploaded images or OCR results outside the active import flow.