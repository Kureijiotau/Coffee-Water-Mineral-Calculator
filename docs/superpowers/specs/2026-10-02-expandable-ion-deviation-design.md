# Expandable per-ion deviation details

## Goal

Let users inspect the ion-level values summarized by Watermancer’s “Final total deviation” panel without leaving the current recipe review.

## Design

- Make the existing summary panel a keyboard-accessible expand/collapse control while retaining its current total, description, and beyond-tolerance count.
- On expansion, show a row for each ion in the active review. Each row includes the target, final mixture value, signed difference (final minus target), and whether the ion is beyond tolerance.
- Preserve the existing evaluation rules and active inputs. Do not recalculate targets, alter the recipe, or change the deviation total.
- Keep the expanded content in the same panel and adapt its columns for narrow screens.

## Interaction and accessibility

- The summary toggles details on click, Enter, or Space and exposes its expanded state to assistive technology.
- Use visible focus styling and descriptive column labels.
- The expanded state is local UI state; it does not persist between sessions.

## Verification

- Test the disclosure interaction and per-ion row values, including signed under/over differences and tolerance status.
- Verify the panel remains usable at narrow viewport widths and does not change matching results.
- Run the app’s relevant test, typecheck, and build checks.

## Scope

Only the existing Watermancer recipe-review deviation panel and its tests are in scope. Solver behavior, matching strategies, and saved recipe data are unchanged.