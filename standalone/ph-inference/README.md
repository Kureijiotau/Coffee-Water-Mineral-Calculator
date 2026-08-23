# Standalone pH inference

`estimatePhFromIons.ts` is intentionally independent from the Coffee Water Calculator.

## What it does

It accepts ion concentrations in ppm (mg/L) and returns:

- a bounded theoretical pH when an explicit acid/base assumption supports one;
- a confidence level;
- the method used;
- warnings describing assumptions and uncertainty.

## What it does not claim

Ion ppm values alone do not uniquely determine precise real-world pH. The same
ion list can correspond to different pH values depending on temperature,
dissolved CO₂, alkalinity, protonation state, ion activity, complexation, and
unmeasured acids or bases.

The function therefore returns `pH: null` for underdetermined cases instead of
inventing precision. For a lone bicarbonate value, it can provide a
medium-confidence estimate only under the explicit open-atmosphere assumption.

## Example

```ts
import { estimatePhFromIons } from './estimatePhFromIons';

const estimate = estimatePhFromIons({
  bicarbonate: 150,
  sodium: 56,
  chloride: 20,
});

console.log(estimate);
// {
//   pH: 8.1...,
//   confidence: 'medium',
//   method: 'open-carbonate',
//   warnings: [...]
// }
```