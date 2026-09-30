# Concentrates Calculator Mode

## Goal

Group Recipe Concentrate and DIY Concentrate under a single **Concentrates** choice in the Calculator mode switcher, alongside Alchemist and Watermancer.

## Approved interaction

- Keep the existing top-level Calculator, Water Tasting, Mixer, and Guide navigation.
- In Calculator, show three peer modes: Alchemist, Watermancer, and Concentrates.
- The Concentrates mode contains nested **Recipe Concentrate** and **DIY Concentrate** tabs.
- Clicking Concentrates opens DIY Concentrate by default.
- The Calculator's “Send to Concentrate” action opens Concentrates on Recipe Concentrate and carries the current recipe handoff.
- The two concentrate workflows retain their current builders, saved configuration, and behavior.

## State and compatibility

Concentrates is a workspace choice, not a chemistry detail level. Entering or leaving it must not change the selected Alchemist/Watermancer chemistry state, recipe inputs, or Watermancer calculations.

Existing saved plans may contain the former top-level `concentrate` or `diy-concentrate` app tab. Restoring those plans must continue to open the corresponding nested concentrate workflow. New navigation should use the unified Calculator/Concentrates structure.

## Verification

- Confirm the mode switcher exposes Alchemist, Watermancer, and Concentrates, and the nested tabs select the correct workspace.
- Confirm clicking Concentrates defaults to DIY Concentrate.
- Confirm “Send to Concentrate” opens Recipe Concentrate with the current recipe and batch volume.
- Confirm leaving and returning to Calculator does not alter chemistry inputs, and saved plans from both former concentrate tabs still restore correctly.
- Run the web app typecheck, unit tests, and production build; inspect the running preview.