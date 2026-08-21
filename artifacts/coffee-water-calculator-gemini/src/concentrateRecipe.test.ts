import { describe, expect, it } from 'vitest';
import { computeRecipeStockSaltMassMg } from './App';

describe('recipe concentrate stock conversion', () => {
  it('preserves the target through strength and stock-volume scaling', () => {
    const targetPpm = 10;
    const stockVolumeMl = 500;
    const strength = 500;
    const hydrationMass = 246.47;
    const anhydrousMass = 120.37;

    expect(
      computeRecipeStockSaltMassMg(
        targetPpm,
        stockVolumeMl,
        strength,
        hydrationMass,
        anhydrousMass,
      ),
    ).toBeCloseTo(10 * 0.5 * 500 * (hydrationMass / anhydrousMass), 8);
  });

  it('returns zero for unusable stock inputs', () => {
    expect(computeRecipeStockSaltMassMg(10, 0, 500, 246.47, 120.37)).toBe(0);
    expect(computeRecipeStockSaltMassMg(10, 500, 0, 246.47, 120.37)).toBe(0);
    expect(computeRecipeStockSaltMassMg(0, 500, 500, 246.47, 120.37)).toBe(0);
  });
});