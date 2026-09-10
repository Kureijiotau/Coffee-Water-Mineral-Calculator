# Water Recipe Share QR Design

## Goal

Keep the existing PNG-recovery QR and add a second QR that opens the app,
saves the recipe, restores its waters and salts, and applies the imported
recipe immediately.

## QR responsibilities

Each saved recipe PNG contains exactly two separate QR codes:

1. **Recovery QR**
   - Keeps the existing `WMQR1:` envelope.
   - Contains the exact serialized recipe payload.
   - Used after embedded PNG metadata has been stripped.
   - Does not navigate to the website.

2. **Share-link QR**
   - Contains an HTTPS URL with a versioned, URL-safe recipe payload.
   - Uses the current app origin when the card is exported. A published app
     will therefore generate links to its published domain.
   - Opens the application instead of displaying raw recipe text.

The current deployment has no published URL, so the implementation must not
hard-code or invent one. It will use the browser origin at export time.

## Share payload

The share payload is a new versioned envelope containing:

- recipe name
- salt target amounts and hydration-form indexes
- base-water entries
- addition-water entries
- each water entry's name, modeled ions, metadata, volume, and local source ID
- final ion readings and final TDS metadata

Existing `.WATER` file payloads remain valid. The share payload is additive and
does not replace metadata or the recovery QR.

## Open-and-apply flow

On application startup, the app checks for the share-link query parameter:

1. Decode and validate the versioned payload.
2. Create a new saved recipe entry, avoiding an accidental duplicate when the
   same link is opened twice.
3. Restore the included base and addition waters.
4. Restore salt targets and hydration forms.
5. Restore final-ion target data for Watermancer when present.
6. Open in **Alchemist** when the payload includes both recipe salts and source
   waters.
7. Open in **Watermancer** for water-only or final-ion-only payloads.
8. Show a temporary imported-recipe highlight/confirmation.
9. Remove the payload from browser history so refresh does not import it again.

The existing file-import paths remain unchanged and continue to use metadata
first, recovery QR second, and ordinary text parsing last.

## Failure handling

- Invalid or unsupported share payloads are ignored without changing the
  current recipe.
- A visible, dismissible error is shown when a valid-looking link cannot be
  applied.
- Missing optional water fields do not prevent salt-only recipe import.
- The app keeps the current screen if the payload cannot be validated.

## Testing

- Round-trip encode/decode tests for the share URL payload.
- Validation tests for salts, water entries, final ions, and unsupported
  versions.
- Import tests proving the link saves a recipe and restores water/salt state.
- Tests proving the recovery QR remains unchanged.
- Browser smoke coverage for opening the URL, applying the recipe, showing the
  confirmation, and clearing the query string.