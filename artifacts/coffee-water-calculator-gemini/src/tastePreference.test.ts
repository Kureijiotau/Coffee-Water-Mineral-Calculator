import { describe, expect, it } from 'vitest';
import { computeIonTotals, SALTS } from './waterData';
import { inferTasteProfile, type TastePreferenceAnswers } from './tastePreference';

const lightWashed: TastePreferenceAnswers = {
  roast: 'light',
  process: 'washed',
  taste: 'clarity',
  acidity: 'bright',
  body: 'light',
  brewMethod: 'pourover',
};

describe('inferTasteProfile', () => {
  it('generates a recipe whose ions match the inferred profile', () => {
    const result = inferTasteProfile(lightWashed);
    const targets = Object.fromEntries(
      SALTS.map(salt => [salt.id, Number(result.recipe.salts[salt.id]?.target ?? 0)]),
    );
    const totals = computeIonTotals(targets, {}, 0);

    expect(totals.magnesium).toBeCloseTo(result.profile.magnesium, 0);
    expect(totals.calcium).toBeCloseTo(result.profile.calcium, 0);
    expect(totals.sulfate).toBeCloseTo(result.profile.sulfate, 0);
    expect(totals.chloride).toBeCloseTo(result.profile.chloride, 0);
    expect(totals.bicarbonate).toBeCloseTo(result.profile.bicarbonate, 0);
    expect(totals.sodium).toBeCloseTo(result.profile.sodium, 0);
  });

  it('does not create negative salt targets or unsupported salts', () => {
    const result = inferTasteProfile({
      ...lightWashed,
      roast: 'dark',
      process: 'coferment',
      taste: 'body',
      acidity: 'soft',
      body: 'full',
      brewMethod: 'espresso',
    });

    for (const [saltId, entry] of Object.entries(result.recipe.salts)) {
      expect(SALTS.some(salt => salt.id === saltId)).toBe(true);
      expect(Number(entry.target)).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(Number(entry.target))).toBe(true);
    }
  });
});