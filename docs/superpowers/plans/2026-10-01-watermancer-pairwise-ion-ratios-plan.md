# Watermancer Pairwise Ion-Ratio Display — Implementation Plan

## Objective

Implement the approved Pairwise / Combined relationship display in both
Watermancer Current ion readings layouts without changing matching or dosing.

## Work sequence

1. Add a small shared ratio display component for the two views. It will format
   each pair as a one-decimal percentage, show `—` for invalid or zero
   denominators, and expose the selected view accessibly.
2. Keep the display selection in the shared Watermancer readings component.
   Derive K/Mg and Na/Ca from the existing `ratioIons`, while retaining the
   existing combined value, total, and severity.
3. Render the shared display in Compact and Classic readings; preserve existing
   ratio-swap controls and use the same modeled/preview ion basis.
4. Extend browser coverage for view switching, shared selection across layout
   changes, correct pair ordering, and unchanged combined display.
5. Run calculator unit tests, browser tests, typecheck, build, and `git diff
   --check`; inspect the existing web workflow after changes.

## Boundaries

- No solver, target, salt-selection, dose, or persistence changes.
- Pairwise values use K ÷ Mg and Na ÷ Ca, in that order.
- Combined output remains `(Na + K) ÷ (Mg + Ca)` with its existing ppm total
  and severity treatment.