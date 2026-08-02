import { describe, expect, it } from 'vitest';
import {
  createWatermancerPlanSignature,
  type WatermancerPlan,
} from './watermancerPlan';

const basePlan = (): WatermancerPlan => ({
  targetIons: { calcium: 10, magnesium: 8, bicarbonate: 20 },
  selectedWaters: [
    {
      id: 'base',
      name: 'Base',
      ions: { calcium: '12', bicarbonate: '24' },
      metadata: {},
      volumeMl: '400',
    },
  ],
  selectedSalts: ['mgso4', 'cacl2'],
  fixedWaterVolumes: { base: 400 },
  fixedSaltDoses: {},
  strategy: 'water-first',
  ionPriority: ['calcium', 'magnesium', 'sodium'],
  allowOvershoot: false,
  overshootLimits: { calcium: 0, bicarbonate: 0 },
  overshootOrder: ['calcium', 'magnesium', 'sodium'],
});

describe('Watermancer plan', () => {
  it('produces the same signature for equivalent salt and map ordering', () => {
    const first = basePlan();
    const second = {
      ...basePlan(),
      targetIons: { bicarbonate: 20, magnesium: 8, calcium: 10 },
      selectedSalts: ['cacl2', 'mgso4'],
      fixedWaterVolumes: { base: 400 },
      overshootLimits: { bicarbonate: 0, calcium: 0 },
    };

    expect(createWatermancerPlanSignature(first))
      .toBe(createWatermancerPlanSignature(second));
  });

  it('changes when a planning decision changes', () => {
    const first = createWatermancerPlanSignature(basePlan());
    const strategyChanged = createWatermancerPlanSignature({
      ...basePlan(),
      strategy: 'closest-match',
    });
    const fixedDoseChanged = createWatermancerPlanSignature({
      ...basePlan(),
      fixedSaltDoses: { nacl: 2.5 },
    });

    expect(strategyChanged).not.toBe(first);
    expect(fixedDoseChanged).not.toBe(first);
  });

  it('captures fixed water volumes independently from water identity', () => {
    const first = createWatermancerPlanSignature(basePlan());
    const volumeChanged = createWatermancerPlanSignature({
      ...basePlan(),
      fixedWaterVolumes: { base: 500 },
    });

    expect(volumeChanged).not.toBe(first);
  });
});