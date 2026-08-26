# Recipe Concentrate Drop Equivalents

## Goal

Make the Concentrate workspace support two complementary preparation styles:

1. **Single-salt concentrates** for delivering a fixed amount of one salt per drop.
2. **All-in-one recipe concentrates** where one drop delivers the full recipe’s salt blend in its intended proportions.

The all-in-one workflow prioritizes the strongest modeled concentration that remains below precipitation and solubility risk, then translates that stock into a practical drop count and salt-equivalent ppm contribution.

## Product behavior

### Single-salt mode

Preserve the existing single-salt workflow:

- Select one salt and hydration form.
- Build the stock by weight.
- Optionally calibrate that finished stock by dispensing and weighing a known number of drops.
- Report salt mass per drop and the drops needed for a target salt mass.

### All-in-one mode

When a recipe is handed off to the Concentrate workspace:

- Preserve the recipe’s selected salts, targets, and hydration forms.
- Compute a modeled maximum safe single-stock strength from the complete salt blend.
- Use that maximum as the default strength.
- Permit lowering the strength, but do not treat values above the modeled ceiling as a valid normal setting.
- Identify the limiting salt or reactive pair when a ceiling exists.
- Keep high total dissolved solids, measurement precision, and mixing difficulty as handling notes rather than silently treating them as precipitation limits.
- Recommend separate stocks when the blend has no practical safe all-in-one strength.

The existing straight-tip and rounded-tip dropper assumptions remain the default. Optional per-bottle calibration uses measured drops per mL and takes precedence over the assumed value for the current stock.

## Calculations

Recipe salt targets remain the canonical final-water basis: salt-equivalent mg/L at strength 1.

For an all-in-one stock with strength `S`:

```text
total salt mg/mL = sum(recipe salt target ppm × S) / 1000
total salt mg/drop = total salt mg/mL / drops per mL
salt-equivalent ppm per drop = total salt mg/drop / final water liters
```

The UI should also expose:

- Drops per liter and drops for the selected batch volume.
- Per-salt mg/drop.
- Ion ppm contributed per drop where the existing salt ion fractions support it.
- A clear distinction between salt-equivalent ppm, summed ion mass, and TDS.

Changing the final water volume changes ppm per drop and batch drops, but does not change the stock’s mg/drop calibration.

## Safety model

Use the shared concentrate chemistry engine as the authority. The all-in-one ceiling must account for:

- Per-salt solubility limits using the selected hydration forms.
- Modeled reactive-pair precipitation risks, including calcium/sulfate, calcium/citrate, carbonate interactions, and bicarbonate-related hardness risk.

The result is a **modeled practical ceiling**, not a laboratory guarantee. The UI must disclose that limitation and preserve existing separation guidance for incompatible blends such as calcium citrate or hardness salts with bicarbonates.

The search must have a documented upper bound. If no modeled chemical limit is reached before that bound, the UI should describe the result as the current model ceiling rather than implying unlimited concentration.

## State and integration

- Extend the existing recipe-concentrate plan state rather than creating a parallel chemistry engine.
- Keep single-salt and all-in-one state isolated so changing one does not overwrite the other.
- Persist the AIO strength, dropper assumption, optional measured drops/mL, and derived plan through the existing concentrate snapshot/handoff path.
- Recalculate all derived values immediately when the recipe, hydration form, strength, dropper assumption, calibration, or final water volume changes.
- Keep the existing standalone single-salt and independent dropper workflows intact.

## Error and empty states

- If no active recipe salts exist, show that an all-in-one stock cannot be calculated.
- If the modeled ceiling is effectively unusable, recommend separate stocks instead of presenting a misleading drop count.
- If optional calibration is invalid or absent, use the selected straight/rounded default and label it as an assumption.
- Never divide by zero or display a confident ppm/drop value without valid strength, dropper rate, and final volume inputs.

## Verification

Add or update tests for:

- Maximum-strength selection being limited by the first modeled precipitation or solubility risk.
- Non-precipitation handling notes not unexpectedly lowering the chemical ceiling.
- Total salt mg/drop and salt-equivalent ppm/drop calculations.
- Per-salt and ion contributions preserving the recipe proportions.
- Default dropper assumptions and optional measured drops/mL overrides.
- Lowering strength updating drops and ppm without changing recipe ratios.
- Invalid or zero inputs producing safe empty values.

Verify with the calculator typecheck, focused concentrate tests, production build, and a running preview of both single-salt and all-in-one states.