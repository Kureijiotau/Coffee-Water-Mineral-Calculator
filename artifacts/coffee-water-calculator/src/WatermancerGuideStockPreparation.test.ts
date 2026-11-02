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
      targetStockMassInput: '50',
      onTargetStockMassInputChange: () => undefined,
      onOpenCalibration: () => undefined,
    }));

    expect(html).toContain('Water-calibrated planning estimate');
    expect(html).toContain('Target stock weight');
    expect(html).toContain('placeholder="e.g. 50"');
    expect(html).toContain('aria-label="Target stock weight in grams"');
    expect(html).toContain('1000.0 mg');
    expect(html).toContain('1.000 g');
    expect(html).toContain('49.000 g');
    expect(html).toContain('50.000 g');
    expect(html).not.toContain('mL stock');
    expect(html).toContain('0.05000 g/water drop');
    expect(html).toContain('Parchment paper being cut into a small piece for weighing salt.');
    expect(html).toContain('9.8–14.7 g');
    expect(html).toContain('remaining measured water');
    expect(html).toContain('Do not tare again');
    expect(html).toContain('This approximation does not apply to finished concentrate.');
  });

  it('does not use another tip style calibration when the selected style has no saved measurement', () => {
    const html = renderToStaticMarkup(createElement(WatermancerGuideStockPreparation, {
      calibrations: {
        straight: { dropsInput: '100', weightInput: '5', style: 'straight' },
      },
      dropperStyle: 'round',
      onDropperStyleChange: () => undefined,
      targetStockMassInput: '50',
      onTargetStockMassInputChange: () => undefined,
      onOpenCalibration: () => undefined,
    }));

    expect(html).toContain('source estimate');
    expect(html).toContain('Calibrate in Step 3');
    expect(html).not.toContain('20.0 drops/mL · Step 3 calibration');
    expect(html).toContain('0.560 g');
    expect(html).toContain('49.440 g');
    expect(html).toContain('50.000 g');
  });
});
