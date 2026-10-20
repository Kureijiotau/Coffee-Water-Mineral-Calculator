import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { computeIonTotals, ION_CHEMISTRY, IONS, type IonId } from './waterData';
import {
  computeHco3EquivalentPpm,
  computeWatermancerMetricValues,
  hasModeledWatermancerIons,
  resolveWatermancerRecipeAnalysis,
} from './watermancerMetricValues';
import { WatermancerBicarbonateEquivalent } from './WatermancerBicarbonateEquivalent';

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

  it('adds citrate charge contribution to actual bicarbonate as an HCO3 equivalent', () => {
    expect(computeHco3EquivalentPpm({
      bicarbonate: ION_CHEMISTRY.bicarbonate.molarMass,
      citrates: ION_CHEMISTRY.citrates.molarMass,
    })).toBeCloseTo(4 * ION_CHEMISTRY.bicarbonate.molarMass, 6);
  });

  it('uses only actual bicarbonate when citrate is absent', () => {
    expect(computeHco3EquivalentPpm({ bicarbonate: 12.5 })).toBe(12.5);
    expect(computeHco3EquivalentPpm({})).toBe(0);
    expect(computeHco3EquivalentPpm({ bicarbonate: -1, citrates: -10 })).toBe(0);
  });

  it('renders the estimated bicarbonate equivalent only when citrate is present', () => {
    const markup = renderToStaticMarkup(createElement(
      WatermancerBicarbonateEquivalent,
      {
        ions: {
          bicarbonate: ION_CHEMISTRY.bicarbonate.molarMass,
          citrates: ION_CHEMISTRY.citrates.molarMass,
        },
      },
    ));

    expect(markup).toContain('HCO₃⁻ Equiv');
    expect(markup).toContain('Citrates');
    expect(markup).toContain('244.067 ppm');
    expect(markup).toContain('depends on pH and speciation');
    expect(renderToStaticMarkup(createElement(
      WatermancerBicarbonateEquivalent,
      { ions: { bicarbonate: 12.5 } },
    ))).toBe('');
  });

  it('sums the same canonical ions used by Review match', () => {
    const ions = Object.fromEntries(
      IONS.map(({ id }, index) => [id, index + 1]),
    ) as Record<IonId, number>;

    expect(computeWatermancerMetricValues(ions).tds)
      .toBe(Object.values(ions).reduce((total, ppm) => total + ppm, 0));
  });

  it('uses selected target ions and target-derived metrics when no mixture ions exist', () => {
    const targets: Partial<Record<IonId, number>> = {
      calcium: 40,
      magnesium: 12,
      bicarbonate: 50,
    };
    const analysis = resolveWatermancerRecipeAnalysis({}, targets, {
      gh: 0,
      kh: 0,
      tds: 0,
    });

    expect(hasModeledWatermancerIons({})).toBe(false);
    expect(analysis.source).toBe('target-preview');
    expect(analysis.ions.calcium).toBe(40);
    expect(analysis.ions.magnesium).toBe(12);
    expect(analysis.metrics).toEqual(computeWatermancerMetricValues(targets));
  });

  it('keeps actual mixture readings and metrics once any modeled ion exists', () => {
    const finalIons: Partial<Record<IonId, number>> = { calcium: 8 };
    const finalMetrics = { gh: 20, kh: 0, tds: 8 };
    const analysis = resolveWatermancerRecipeAnalysis(
      finalIons,
      { calcium: 40, magnesium: 12 },
      finalMetrics,
    );

    expect(hasModeledWatermancerIons(finalIons)).toBe(true);
    expect(analysis.source).toBe('final-mixture');
    expect(analysis.ions.calcium).toBe(8);
    expect(analysis.ions.magnesium).toBe(0);
    expect(analysis.metrics).toEqual(finalMetrics);
  });
});
