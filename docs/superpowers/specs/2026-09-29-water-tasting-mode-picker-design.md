# Water Tasting Mode-Grouped Recipe Picker

## Goal

Make the Water Tasting water-profile selector reflect the recipes and profiles
available from the Alchemist and Watermancer workspaces. The selector must have
exactly two source groups: **Alchemist** and **Watermancer**.

## Source groups

### Alchemist

Include the options exposed by Alchemist's own selectors:

- The current custom setup, when it has usable ion readings.
- Locally saved mineral recipes.
- Built-in Kimoi.coffee recipes.
- Watering Hole filter, tap-water-proxy, and espresso recipes.
- Alchemist ion profiles available in Alchemist, including user-saved profiles
  and published empirical profiles.

Do not list Aiki's safe profile or the Watermancer Sensory profile in this group.

### Watermancer

Include the options exposed by Watermancer's target selector:

- Saved Watermancer profiles.
- Saved mineral recipes and built-in Kimoi.coffee recipes.
- Published empirical water profiles.
- Watering Hole filter, tap-water-proxy, espresso, and finished-water recipes.
- Lotus Coffee recipes.
- Watermancer's canonical built-in Aiki safe profile, Current salt table, and
  Watermancer Sensory profile.

The canonical Watermancer built-ins appear once here; there is no separate
Built-in group. A recipe available in both modes may appear in both groups,
because each group represents that mode's own picker. Do not duplicate the
canonical built-ins in Alchemist.

## Readings and selection identity

Each option resolves to readings belonging to that exact source:

- Ion profiles use their own target readings.
- Saved Watermancer profiles use finished readings when present, otherwise
  their saved target readings.
- Salt recipes use their computed ion totals or published targets.
- Current setup and Current salt table use their corresponding live
  calculations.
- The Aiki safe profile and Watermancer Sensory profile use their own profile
  targets.

Selecting an Alchemist profile or recipe must not silently display the active
Alchemist recipe's readings. Options shared across modes use mode-qualified
source IDs so each group resolves unambiguously. Existing tasting records
remain editable; legacy IDs keep their current compatibility behavior.

## Out of scope

Do not add a separate catalog of arbitrary local waters, shared database
waters, or current base-water entries that are not already offered by either
mode's selectors. This change mirrors the two mode pickers rather than every
water source in the application.

## Acceptance criteria

- Every eligible Alchemist and Watermancer picker entry appears in its
  corresponding group.
- The dropdown contains only the Alchemist and Watermancer groups.
- Aiki's safe profile, Current salt table, and Watermancer Sensory appear only
  under Watermancer.
- Selecting any option shows that option's actual ion readings.
- Mode-shared recipes remain distinguishable by group and do not create
  duplicate option IDs.
- Existing tasting records and edit flows continue to work.
- Tests cover source-list completeness, group placement, duplicate built-ins,
  unique source IDs, and per-source reading resolution.