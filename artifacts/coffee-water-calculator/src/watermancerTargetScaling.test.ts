import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WATERMANCER_STRENGTH_PERCENT,
  normalizeWatermancerStrengthPercent,
  scaleWatermancerTargets,
  unscaleWatermancerTargets,
} from './watermancerTargetScaling';

describe('Watermancer target strength scaling', () => {
  it('keeps the source target values at 100%', () => {
    expect(scaleWatermancerTargets({ calcium: 40, magnesium: 12 }, 100)).toEqual({
      calcium: 40,
      magnesium: 12,
    });
  });

  it('scales all present targets uniformly and preserves zero targets', () => {
    expect(scaleWatermancerTargets({ calcium: 40, magnesium: 12, sodium: 0 }, 150)).toEqual({
      calcium: 60,
      magnesium: 18,
      sodium: 0,
    });
  });

  it('returns zero targets at 0% and doubles them at 200%', () => {
    expect(scaleWatermancerTargets({ calcium: 40, magnesium: 12 }, 0)).toEqual({
      calcium: 0,
      magnesium: 0,
    });
    expect(scaleWatermancerTargets({ calcium: 40, magnesium: 12 }, 200)).toEqual({
      calcium: 80,
      magnesium: 24,
    });
  });

  it('keeps absent targets absent and drops invalid target values', () => {
    expect(scaleWatermancerTargets({
      calcium: 10,
      sodium: Number.NaN,
      chloride: -1,
    }, 100)).toEqual({ calcium: 10 });
  });

  it('bounds and snaps strength values to 5% increments', () => {
    expect(normalizeWatermancerStrengthPercent(-10)).toBe(0);
    expect(normalizeWatermancerStrengthPercent(217)).toBe(200);
    expect(normalizeWatermancerStrengthPercent(102)).toBe(100);
    expect(normalizeWatermancerStrengthPercent(108)).toBe(110);
    expect(normalizeWatermancerStrengthPercent(Number.NaN)).toBe(DEFAULT_WATERMANCER_STRENGTH_PERCENT);
  });

  it('removes the temporary multiplier when creating a profile from live mixture readings', () => {
    expect(unscaleWatermancerTargets({ calcium: 60, magnesium: 18 }, 150)).toEqual({
      calcium: 40,
      magnesium: 12,
    });
    expect(unscaleWatermancerTargets({ calcium: 5 }, 0)).toEqual({ calcium: 5 });
  });
});