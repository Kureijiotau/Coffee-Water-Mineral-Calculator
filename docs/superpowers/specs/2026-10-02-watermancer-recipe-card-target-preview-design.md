# Watermancer Recipe Card Target-Analysis Preview

## Problem

When Watermancer has no modeled mixture ions, its ratio and metric summaries preview the selected target profile. The Recipe steps mineral-analysis card instead calculates only from entered water and salt inputs, so its readings are zero. The card should use the same target profile as a clearly marked preview until a modeled mixture exists.

## Approved design

- In Watermancer, use target ion values for the recipe-card mineral analysis only while no modeled final-mixture ions exist. Use the same empty-mixture condition as the Watermancer ratio preview.
- Derive displayed GH, KH, and modeled TDS using the same canonical target metrics as the Watermancer preview; do not add a separate chemistry interpretation.
- Mark the card as a target preview, including labels that distinguish target concentrations and target TDS from a finished mixture.
- Apply the same visible preview values and label to the downloaded recipe-card image.
- As soon as modeled final-mixture ions exist, show the existing actual-mixture analysis and labels instead.
- Do not invent water or salt recipe steps to support the preview. Do not change Alchemist behavior.
- Keep the embedded `.WATER.png` finished-water ion readings and TDS tied to actual configured inputs. Target-preview values are visual guidance, not finished-water measurements, and must not become Mixer import data.

## Data flow

The shared Recipe steps modal already receives the selected Watermancer profile and computes final-mixture analysis from current salt targets and source waters. The implementation should choose the analysis display values separately from the actual finished-water payload: use selected profile targets for the visible preview, while preserving actual computed readings for import metadata.

## Verification

- With no modeled Watermancer ions, the on-screen analysis and saved image show selected target ions plus matching target GH, KH, and TDS, clearly labeled as a preview.
- With modeled final-mixture ions, both surfaces show the existing actual readings and current-mixture labels.
- A saved `.WATER.png` created in preview state retains actual finished-water readings in its embedded payload, not target-preview values.
- Alchemist Recipe steps and non-preview Watermancer calculations remain unchanged.