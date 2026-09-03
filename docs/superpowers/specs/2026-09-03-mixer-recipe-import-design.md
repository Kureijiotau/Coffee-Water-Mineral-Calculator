# Mixer Recipe Import

## Goal

Allow the Water Mixer to import recipes from the calculator's existing legacy
formats and the current recipe-card format. Imported recipes become finished
water sources backed by a snapshot of their saved final ion readings. The Mixer
must not re-solve salt doses or alter its existing volume-weighted blend
calculation.

## User experience

The Mixer provides one `Import recipe` action alongside its source controls.
The file picker accepts JSON recipe/session files and recipe-card PNG files:

- `.json`
- `.WATER`
- `.water`
- `.png`
- `.WATER.png`
- `.water.png`

After a successful import, the first empty source slot is populated. If both
slots already contain sources, the user chooses whether to replace Water A or
Water B before the snapshot is applied. The imported source keeps the recipe
name and is labeled as an imported finished-water source.

The import does not retain the original file. It stores only the normalized
source snapshot in the current Mixer state; saving a Mixer recipe continues to
store source snapshots as it does today.

## Supported payloads

### Legacy finished-water recipe JSON

Accept the existing `coffee-water-recipe` payload when it contains numeric
final `ions`. Normalize known active ion IDs and treat omitted active IDs as
zero. Preserve a compatible reported TDS value when present.

### Legacy/full calculator session JSON

Accept the existing `coffee-water-plan` payload. Derive the session's final
water ions through the existing calculator final-ion computation path. Do not
duplicate or modify Watermancer solver logic in the Mixer parser.

### New recipe-card PNG

The recipe card already displays final analysis readings. Extend its embedded
JSON metadata to include those final readings and available final-water
metadata while retaining the existing salt recipe fields. New cards therefore
import without OCR or image interpretation. Existing cards remain valid for
Calculator import; cards created before the metadata extension are rejected by
the Mixer if they do not contain final readings.

The embedded payload remains compatible with the existing `coffee-water-recipe`
kind. Additional final-water fields are optional to existing consumers and are
used only by the Mixer import normalizer.

### Unsupported files

Salt-only recipe files without saved final readings are not recalculated from
salt amounts. They fail with an actionable message explaining that the Mixer
needs finished-water ion readings and suggesting export of a current recipe
card or finished-water session.

Malformed JSON, invalid PNG metadata, negative/non-finite ion readings, and
unsupported payload kinds receive a visible import error. Import failures must
not change either Mixer source.

## Architecture and data flow

1. The Mixer file input reads the selected file as bytes.
2. A small import-normalization boundary:
   - extracts embedded recipe JSON from PNG metadata when the file is a PNG;
   - parses supported JSON payloads;
   - derives final ions for full sessions through the existing shared
     calculator computation;
   - normalizes the result to `WaterMixSourceSnapshot`.
3. The Mixer places the snapshot into the selected source slot.
4. Existing `calculateWaterMix` recomputes final ions, GH, KH, TDS, and
   metadata from the two source snapshots.

Source snapshots imported from files use the existing `saved-recipe` source
kind. They are independent of later edits to saved recipes, sessions, or
catalog entries.

## Error and state rules

- Ignore repeated file-selection events for the same invalid file only after
  the user has received the error; a later valid selection must always work.
- Clear a previous import error when a new file is selected.
- Do not partially update a source while parsing.
- Do not overwrite an occupied source without explicit confirmation.
- Keep the Mixer calculation and save/reopen flows unchanged after import.

## Testing

Pure tests cover:

- legacy finished-water JSON normalization;
- full calculator session final-ion derivation;
- new recipe-card metadata normalization;
- PNG metadata extraction failure;
- salt-only payload rejection;
- invalid and negative readings;
- preserving the source snapshot after the original payload changes.

UI/browser coverage covers:

- importing into Water A;
- importing a second file into Water B;
- choosing a replacement when both slots are occupied;
- displaying the imported source in the blend result;
- successful import followed by save and reopen;
- visible errors that leave existing sources unchanged.

## Non-goals

- OCR or visual parsing of recipe-card images.
- Re-solving salt amounts from legacy salt-only recipes.
- Three-or-more-water blends.
- Watermancer target matching or salt optimization.
- Changing the shared Watermancer chemistry engine.