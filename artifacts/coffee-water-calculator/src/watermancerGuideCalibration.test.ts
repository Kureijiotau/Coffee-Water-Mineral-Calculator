import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { LotusDropperCalibration, LotusDropperStyle } from './lotusConcentrate';

type CalibrationCardsProps = {
  calibrations?: Partial<Record<LotusDropperStyle, LotusDropperCalibration>>;
  onUse: (style: LotusDropperStyle, calibration: LotusDropperCalibration) => void;
};

describe('Watermancer Guide dropper calibration cards', () => {
  it('tells users to apply the measured values to both DIY tools', async () => {
    const content = await import('./watermancerGuideContent');
    const calibrationStep = content.WATERMANCER_GUIDE_STEPS.find(step => step.id === 'calibrate');

    expect(calibrationStep?.details.join(' ')).toContain('Use');
    expect(calibrationStep?.details.join(' ')).toContain('DIY Stock Builder');
    expect(calibrationStep?.details.join(' ')).toContain('DIY Lotus Drops');
  });

  it('renders separate photo-backed cards and Use controls for both tip styles', async () => {
    const guide = await import('./WatermancerGuide');
    const Cards = Reflect.get(guide, 'WatermancerGuideCalibrationCards') as
      | ComponentType<CalibrationCardsProps>
      | undefined;

    expect(typeof Cards).toBe('function');
    if (!Cards) return;

    const html = renderToStaticMarkup(createElement(Cards, {
      calibrations: {},
      onUse: () => undefined,
    }));

    expect(html).toContain('data-testid="guide-calibration-photo-straight"');
    expect(html).toContain('data-testid="guide-calibration-photo-round"');
    expect(html).toContain('aria-label="Straight measured drops"');
    expect(html).toContain('aria-label="Round water weight in grams"');
    expect(html).toContain('aria-label="Use straight tip calibration"');
    expect(html).toContain('aria-label="Use round tip calibration"');
  });
});
