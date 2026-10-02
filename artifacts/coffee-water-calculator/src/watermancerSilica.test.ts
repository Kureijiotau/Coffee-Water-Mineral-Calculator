import { describe, expect, it } from 'vitest';
import {
  EIDON_SILICA_LABEL_BASIS,
  normalizeWatermancerSilicaDrops,
  watermancerSilicaDoseMg,
  watermancerSilicaPpm,
} from './watermancerSilica';

describe('Watermancer silica dose', () => {
  it('uses the Eidon label basis', () => {
    expect(EIDON_SILICA_LABEL_BASIS).toEqual({
      servingDrops: 30,
      servingVolumeMl: 2,
      silicaMgPerServing: 375,
      silicaMgPerDrop: 12.5,
    });
    expect(watermancerSilicaDoseMg(1)).toBe(12.5);
    expect(watermancerSilicaDoseMg(3)).toBe(37.5);
  });

  it('normalizes drops to a nonnegative whole count', () => {
    expect(normalizeWatermancerSilicaDrops(2.9)).toBe(2);
    expect(normalizeWatermancerSilicaDrops(-1)).toBe(0);
    expect(normalizeWatermancerSilicaDrops(Number.NaN)).toBe(0);
  });

  it('calculates finished-water concentration in mg/L (approximately ppm)', () => {
    expect(watermancerSilicaPpm(2, 1)).toBe(25);
    expect(watermancerSilicaPpm(2, 2)).toBe(12.5);
    expect(watermancerSilicaPpm(2, 0)).toBe(0);
  });
});