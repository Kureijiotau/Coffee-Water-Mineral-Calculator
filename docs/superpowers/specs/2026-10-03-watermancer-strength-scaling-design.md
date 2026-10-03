# Watermancer Strength Scaling

## Goal

Add a Watermancer-only slider for scaling a selected ion target profile up or down while preserving its relative ion balance. The slider must not affect Alchemist or Brewer.

## Design

Add a **Strength** range control near Watermancer's target/profile controls. It ranges from **0% to 200%** in **5% steps** and defaults to **100%**. Show the current percentage alongside the control. Use an accessible native range input with a visible label and keyboard support.

Keep the strength control out of the standalone row above the Watermancer profile card. Place a compact **Target strength** button in the profile-card heading; it opens a small anchored popover containing the current percentage and slider. Keep the popover closed by default. Closing it must not change the selected percentage; persist the percentage as before, but keep the open/closed state transient.

Keep the selected target source and its base values unchanged. Derive effective targets by multiplying each active ion target by `strengthPercent / 100`. A zero target remains zero. At 100%, effective targets exactly equal the source targets. Display effective targets in the matching context so the user can see the values being matched; profile selection, comparison, and saved profile data continue to represent the unscaled source.

Use the effective target map consistently for Watermancer's target-value matching, ratio-mode ion floors, live target gaps, automatic route solving, best-match search, and match review. The matching ratio relationships themselves are unchanged. Changing strength immediately invalidates and recalculates any result through the existing Watermancer plan/signature flow; do not create a parallel solver or cached result path.

Keep selected water sources, their visible volume inputs, selected salts, hydration forms, and manual salt-dose overrides unchanged when strength changes. The existing solver remains responsible for finding a match from those inputs. If a scaled target cannot be reached because of ingredient constraints or fixed doses, show the existing partial-match/deviation reporting rather than silently changing the user's inputs.

Persist the strength percentage with the existing Watermancer session/state snapshot. Older snapshots without this field restore to 100%. A Watermancer workspace reset returns it to 100%. Do not bake the multiplier into saved target profiles.

## Data flow and boundaries

1. Resolve the currently selected source profile or custom target values as the base target map.
2. Derive effective target values from the base map and the bounded strength percentage.
3. Pass the effective map through the existing Watermancer plan, so its signature changes when strength changes and all dependent results recalculate.
4. Keep source-profile selection, water and salt selections, and manual doses separate from the multiplier.

The scale helper should be deterministic, preserve missing/zero target semantics, and never produce negative or non-finite target values. Clamp restored or otherwise invalid slider state to the supported range.

## Verification

- Unit-test 0%, 100%, and 200% scaling, including zero, missing, and invalid targets.
- Verify changing strength changes the plan signature and recalculates both target-value and ratio-mode matches.
- Verify target gaps and match review use effective values while the selected source profile and saved profile values remain unscaled.
- Verify water/salt selections, hydration forms, visible water volumes, and fixed manual doses remain unchanged across slider adjustments; constrained plans still report partial matches.
- Verify snapshot save/restore, the 100% default for older snapshots, reset behavior, and isolation from Alchemist and Brewer.
- Verify the strength panel is collapsed initially, can be shown and hidden accessibly, and retains its percentage when collapsed.
- Run the calculator's relevant tests, type checking, and production build.