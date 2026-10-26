import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WatermancerGuideStockPreparation } from './WatermancerGuideStockPreparation';

describe('Watermancer Guide stock preparation card', () => {
  it('shows matching salt, water, and total amounts from the saved tip calibration', () => {
    const html = renderToStaticMarkup(createElement(WatermancerGuideStockPreparation, {
      calibrations: {
        straight: { dropsInput: '100', weightInput: '5', style: 'straight' },
      },
      dropperStyle: 'straight',
      onDropperStyleChange: () => undefined,
      workingFillVolumeInput: '50',
      onWorkingFillVolumeInputChange: () => undefined,
      onOpenCalibration: () => undefined,
    }));

    expect(html).toContain('Same tip calibration and working fill volume means the same salt mass for every salt.');
    expect(html).toContain('Working fill volume');
    expect(html).toContain('placeholder="e.g. 50"');
    expect(html).toContain('aria-label="Working fill volume in milliliters"');
    expect(html).toContain('1000.0 mg');
    expect(html).toContain('1.000 g');
    expect(html).toContain('49.000 g');
    expect(html).toContain('50.000 g');
    expect(html).toContain('≈ 50.0 mL stock · minimum bottle capacity 55.0 mL');
    expect(html).toContain('20.0 drops/mL · Step 3 calibration');
    expect(html).toContain('Parchment paper being cut into a small piece for weighing salt.');
    expect(html).toContain('Transfer the salt to its bottle, then add the water amount shown.');
    expect(html).toContain('Tip: Use a splash of your measured water to rinse any clinging crystals off the parchment into the bottle.');
    expect(html).toContain('For example, a 50 mL fill in a 59 mL bottle leaves about 9 mL of headroom.');
  });

  it('does not use another tip style calibration when the selected style has no saved measurement', () => {
    const html = renderToStaticMarkup(createElement(WatermancerGuideStockPreparation, {
      calibrations: {
        straight: { dropsInput: '100', weightInput: '5', style: 'straight' },
      },
      dropperStyle: 'round',
      onDropperStyleChange: () => undefined,
      workingFillVolumeInput: '50',
      onWorkingFillVolumeInputChange: () => undefined,
      onOpenCalibration: () => undefined,
    }));

    expect(html).toContain('11.2 drops/mL · estimate');
    expect(html).toContain('Calibrate in Step 3');
    expect(html).not.toContain('20.0 drops/mL · Step 3 calibration');
    expect(html).toContain('0.560 g');
    expect(html).toContain('49.440 g');
    expect(html).toContain('50.000 g');
  });
});
