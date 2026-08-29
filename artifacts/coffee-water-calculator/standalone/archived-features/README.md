# Archived Watermancer features

These features are intentionally preserved for possible future reintegration, but
are not part of the live workspace flow.

## Archived features

- **Brewer workspace** — the Brewer-specific calculations and UI remain in the
  historical `App.tsx` implementation, but Brewer is no longer selectable in
  the live mode switch. Existing saved Brewer plans are restored as Alchemist
  plans instead of reopening the retired mode.
- **Water Intent Assistant** — `src/WaterIntentAssistant.tsx` and
  `artifacts/api-server/src/routes/water-assistant.ts` are retained as dormant
  source. The API route is no longer registered by the live API router.
- **Taste Profile card** — `src/TasteProfileCard.tsx` is retained but no longer
  imported by the live application.
- **Coffee preference questionnaire** — `src/TastePreferenceModal.tsx` and
  `src/tastePreference.ts` are retained but no longer imported by the live
  application.
- **Workframe profile builder** — `src/WorkframeProfileBuilder.tsx` and
  `src/workframe.ts` are retained but no longer imported by the live
  application.
- **Label Scanner** — `src/LabelScanner.tsx` and the registered
  `/api/scan-label` endpoint remain available for later reintegration. The
  scanner component is not imported by the live web app, so it is not included
  in the browser bundle.

## Preserved live feature

Robert Asami's seven-day water crash course remains available from the **Guide**
tab. It stays lazy-loaded and is only downloaded when that tab is opened.

## Reintegration notes

Before reactivating an archived feature, restore its UI entry point and verify
its state/persistence behavior against the current Alchemist and Watermancer
plan formats. Do not restore the old Brewer default automatically; make the
mode a deliberate user choice.