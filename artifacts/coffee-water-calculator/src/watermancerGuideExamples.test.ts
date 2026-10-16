import { describe, expect, it } from 'vitest';
import { WATERMANCER_COUNTERION_EXAMPLES } from './watermancerGuideExamples';

describe('Watermancer Guide counterion examples', () => {
  it('holds magnesium, calcium, bicarbonate, GH, and KH constant while changing counterions', () => {
    const [chloride, sulfate] = WATERMANCER_COUNTERION_EXAMPLES;

    expect(chloride.model.analysis.ions.map(ion => [ion.id, ion.value]))
      .toEqual(expect.arrayContaining([
        ['magnesium', 10],
        ['calcium', 20],
        ['bicarbonate', 30],
      ]));
    expect(sulfate.model.analysis.ions.map(ion => [ion.id, ion.value]))
      .toEqual(expect.arrayContaining([
        ['magnesium', 10],
        ['calcium', 20],
        ['bicarbonate', 30],
      ]));
    expect(chloride.model.analysis.gh).toBeCloseTo(91.12, 2);
    expect(sulfate.model.analysis.gh).toBeCloseTo(91.12, 2);
    expect(chloride.model.analysis.kh).toBeCloseTo(24.6, 2);
    expect(sulfate.model.analysis.kh).toBeCloseTo(24.6, 2);

    const chlorideIons = Object.fromEntries(chloride.model.analysis.ions.map(ion => [ion.id, ion.value]));
    const sulfateIons = Object.fromEntries(sulfate.model.analysis.ions.map(ion => [ion.id, ion.value]));
    expect(chlorideIons.chloride).toBeGreaterThan(0);
    expect(chlorideIons.sodium).toBeGreaterThan(0);
    expect(chlorideIons.sulfate).toBe(0);
    expect(chlorideIons.potassium).toBe(0);
    expect(sulfateIons.sulfate).toBeGreaterThan(0);
    expect(sulfateIons.potassium).toBeGreaterThan(0);
    expect(sulfateIons.chloride).toBe(0);
    expect(sulfateIons.sodium).toBe(0);

    const chargeBalance = (ions: Record<string, number>) => {
      const cationMeq =
        (ions.sodium ?? 0) / 22.990
        + (ions.potassium ?? 0) / 39.098
        + 2 * (ions.magnesium ?? 0) / 24.305
        + 2 * (ions.calcium ?? 0) / 40.078;
      const anionMeq =
        (ions.bicarbonate ?? 0) / 61.017
        + (ions.chloride ?? 0) / 35.450
        + 2 * (ions.sulfate ?? 0) / 96.06;
      return { cationMeq, anionMeq };
    };
    expect(chargeBalance(chlorideIons).cationMeq).toBeCloseTo(chargeBalance(chlorideIons).anionMeq, 8);
    expect(chargeBalance(sulfateIons).cationMeq).toBeCloseTo(chargeBalance(sulfateIons).anionMeq, 8);
  });

  it('builds both image sources from the recipe-step share-card renderer', () => {
    for (const example of WATERMANCER_COUNTERION_EXAMPLES) {
      expect(example.imageSrc).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
      expect(example.imageAlt).toContain('same magnesium, calcium, and bicarbonate targets');
      expect(example.model.batchLabel).toContain('1 L');
      expect(example.model.waterSteps[0].name).toContain('0-TDS');
      expect(example.model.saltSteps).toHaveLength(3);
    }
  });
});
