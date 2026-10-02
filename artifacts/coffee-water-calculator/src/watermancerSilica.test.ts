import { describe, expect, it } from 'vitest';
import {
  EIDON_SILICA_LABEL_BASIS,
  normalizeWatermancerSilicaDrops,
  watermancerSilicaDropsForTarget,
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

  it('rounds a target to the nearest whole drop for the current batch volume', () => {
    expect(watermancerSilicaDropsForTarget(25, 1)).toBe(2);
    expect(watermancerSilicaDropsForTarget(25, 2)).toBe(4);
    expect(watermancerSilicaDropsForTarget(18, 1)).toBe(1);
    expect(watermancerSilicaDropsForTarget(0, 1)).toBe(0);
    expect(watermancerSilicaDropsForTarget(25, 0)).toBe(0);
    expect(watermancerSilicaDropsForTarget(Number.NaN, 1)).toBe(0);
  });
});