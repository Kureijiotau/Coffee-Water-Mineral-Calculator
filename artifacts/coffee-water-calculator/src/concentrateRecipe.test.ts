import { describe, expect, it } from 'vitest';
import { computeRecipeConcentrateDropEquivalents, computeRecipeStockSaltMassMg } from './App';
import { SALTS } from './waterData';

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

describe('all-in-one recipe drop equivalents', () => {
  it('preserves recipe proportions and applies hydration to physical salt mass', () => {
    const result = computeRecipeConcentrateDropEquivalents({
      saltTargets: { mgso4: 10, cacl2: 5 },
      strength: 100,
      dropsPerMl: 20,
      finalLiters: 1,
    });
    const mgso4 = result.perSalt.find(row => row.saltId === 'mgso4')!;
    const cacl2 = result.perSalt.find(row => row.saltId === 'cacl2')!;
    const mgso4Definition = SALTS.find(salt => salt.id === 'mgso4')!;
    const cacl2Definition = SALTS.find(salt => salt.id === 'cacl2')!;

    expect(result.valid).toBe(true);
    expect(mgso4.saltMgPerDrop).toBeCloseTo(
      10 * 100 / 1000 * (mgso4Definition.hydrationForms[mgso4Definition.defaultFormIdx ?? 0].molarMass / mgso4Definition.anhydrousMass) / 20,
      8,
    );
    expect(cacl2.targetPpm / mgso4.targetPpm).toBe(0.5);
    expect(result.totalSaltMgPerDrop).toBeCloseTo(mgso4.saltMgPerDrop + cacl2.saltMgPerDrop, 8);
    expect(result.saltEquivalentPpmPerDrop).toBeCloseTo((10 + 5) * 100 / 1000 / 20, 8);
    expect(result.dropsPerLiter).toBe(200);
    expect(result.batchDrops).toBe(200);
    expect(cacl2.formLabel).toBe(cacl2Definition.hydrationForms[cacl2Definition.defaultFormIdx ?? 0].label);
  });

  it('reports ion contributions separately from salt-equivalent ppm', () => {
    const result = computeRecipeConcentrateDropEquivalents({
      saltTargets: { cacl2: 10 },
      strength: 100,
      dropsPerMl: 20,
      finalLiters: 2,
    });

    expect(result.valid).toBe(true);
    expect(result.saltEquivalentPpmPerDrop).toBeCloseTo(10 * 100 / 1000 / 20 / 2, 8);
    expect(result.ionPpmPerDrop.calcium).toBeGreaterThan(0);
    expect(result.ionPpmPerDrop.chloride).toBeGreaterThan(0);
  });

  it('supports measured dropper overrides through the active rate', () => {
    const assumed = computeRecipeConcentrateDropEquivalents({
      saltTargets: { nahco3: 10 },
      strength: 500,
      dropsPerMl: 20,
      finalLiters: 1,
    });
    const measured = computeRecipeConcentrateDropEquivalents({
      saltTargets: { nahco3: 10 },
      strength: 500,
      dropsPerMl: 25,
      finalLiters: 1,
    });

    expect(measured.totalSaltMgPerDrop).toBeCloseTo(assumed.totalSaltMgPerDrop * 20 / 25, 8);
    expect(measured.dropsPerLiter).toBe(50);
  });

  it('returns safe empty values for invalid or empty inputs', () => {
    for (const input of [
      { saltTargets: {}, strength: 500, dropsPerMl: 20, finalLiters: 1 },
      { saltTargets: { nahco3: 10 }, strength: 0, dropsPerMl: 20, finalLiters: 1 },
      { saltTargets: { nahco3: 10 }, strength: 500, dropsPerMl: 0, finalLiters: 1 },
      { saltTargets: { nahco3: 10 }, strength: 500, dropsPerMl: 20, finalLiters: 0 },
      { saltTargets: { nahco3: Number.NaN }, strength: 500, dropsPerMl: 20, finalLiters: 1 },
    ]) {
      const result = computeRecipeConcentrateDropEquivalents(input);
      expect(result.valid).toBe(false);
      expect(result.totalSaltMgPerDrop).toBe(0);
      expect(result.perSalt).toEqual([]);
    }
  });
});