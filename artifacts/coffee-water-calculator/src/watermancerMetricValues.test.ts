import { describe, expect, it } from 'vitest';
import { computeIonTotals, IONS, type IonId } from './waterData';
import { computeWatermancerMetricValues } from './watermancerMetricValues';

describe('computeWatermancerMetricValues', () => {
  it('returns GH, KH, and modeled TDS from the same complete ion map', () => {
    const ions = computeIonTotals(
      { mgso4: 35, cacl2: 28, nahco3: 42, nacl: 13 },
      { sodium: 4, bicarbonate: 7, chloride: 2 },
      1,
    );
    const values = computeWatermancerMetricValues(ions);

    expect(values.gh).toBeGreaterThan(0);
    expect(values.kh).toBeGreaterThan(0);
    expect(values.tds).toBeCloseTo(
      Object.values(ions).reduce((total, ppm) => total + ppm, 0),
      8,
    );
  });

  it('treats missing target ions as zero', () => {
    const ions: Partial<Record<IonId, number>> = {
      calcium: 12,
      magnesium: 8,
      bicarbonate: 25,
    };
    const values = computeWatermancerMetricValues(ions);

    expect(values.gh).toBeGreaterThan(0);
    expect(values.kh).toBeGreaterThan(0);
    expect(values.tds).toBe(45);
  });

  it('returns zero metrics for an empty ion profile', () => {
    expect(computeWatermancerMetricValues({})).toEqual({
      gh: 0,
      kh: 0,
      tds: 0,
    });
  });

  it('sums the same canonical ions used by Review match', () => {
    const ions = Object.fromEntries(
      IONS.map(({ id }, index) => [id, index + 1]),
    ) as Record<IonId, number>;

    expect(computeWatermancerMetricValues(ions).tds)
      .toBe(Object.values(ions).reduce((total, ppm) => total + ppm, 0));
  });
});