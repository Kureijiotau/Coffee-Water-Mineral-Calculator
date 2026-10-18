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
      bottleVolumeInput: '30',
      onBottleVolumeInputChange: () => undefined,
      onOpenCalibration: () => undefined,
    }));

    expect(html).toContain('500.0 mg');
    expect(html).toContain('0.500 g');
    expect(html).toContain('24.500 g');
    expect(html).toContain('25.000 g');
    expect(html).toContain('25.0 mL stock · 5 mL headroom');
    expect(html).toContain('20.0 drops/mL · Step 3 calibration');
    expect(html).toContain('Parchment paper being cut into a small piece for weighing salt.');
    expect(html).toContain('Transfer the salt to its bottle, then add the water amount shown.');
  });

  it('does not use another tip style calibration when the selected style has no saved measurement', () => {
    const html = renderToStaticMarkup(createElement(WatermancerGuideStockPreparation, {
      calibrations: {
        straight: { dropsInput: '100', weightInput: '5', style: 'straight' },
      },
      dropperStyle: 'round',
      onDropperStyleChange: () => undefined,
      bottleVolumeInput: '30',
      onBottleVolumeInputChange: () => undefined,
      onOpenCalibration: () => undefined,
    }));

    expect(html).toContain('11.2 drops/mL · estimate');
    expect(html).toContain('Calibrate in Step 3');
    expect(html).not.toContain('20.0 drops/mL · Step 3 calibration');
    expect(html).toContain('0.280 g');
  });
});
