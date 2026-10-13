import { describe, expect, it } from 'vitest';
import {
  WATERMANCER_GUIDE_REFERENCES,
  WATERMANCER_GUIDE_STEPS,
} from './watermancerGuideContent';

describe('Watermancer Guide copy', () => {
  it('distinguishes physical salt mass from finished-water ion readings', () => {
    const stepText = JSON.stringify(WATERMANCER_GUIDE_STEPS);
    const referenceText = JSON.stringify(WATERMANCER_GUIDE_REFERENCES);
    const allText = `${stepText} ${referenceText}`;

    expect(WATERMANCER_GUIDE_STEPS).toHaveLength(6);
    expect(WATERMANCER_GUIDE_REFERENCES).toHaveLength(8);

    expect(stepText).toMatch(/supplies/i);
    expect(stepText).toMatch(/count and weigh/i);
    expect(stepText).toMatch(/1\.00 mg.*per drop/i);
    expect(stepText).toMatch(/balanced.*target/i);
    expect(stepText).toMatch(/mineral.water/i);
    expect(stepText).toMatch(/hydration form/i);
    expect(stepText).toMatch(/required salt mass in mg.*actual salt mg per drop/i);
    expect(stepText).toMatch(/1 L.*0.TDS.*1 L/i);

    expect(referenceText).toMatch(/calibration/i);
    expect(referenceText).toMatch(/hydration form/i);
    expect(referenceText).toMatch(/charge balance/i);
    expect(referenceText).toMatch(/mineral.water/i);
    expect(referenceText).toMatch(/final volume/i);
    expect(referenceText).toMatch(/dose.to.drop/i);
    expect(referenceText).toMatch(/taste/i);

    expect(allText).not.toMatch(/SodaStream|Magnesium Hydroxide|Calcium Carbonate/i);
    expect(allText).toMatch(/conductivity|TDS/i);
  });
});
