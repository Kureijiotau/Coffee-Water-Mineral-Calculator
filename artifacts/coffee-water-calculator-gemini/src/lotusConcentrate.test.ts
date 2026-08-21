import { describe, expect, it } from 'vitest';
import {
  LOTUS_BOTTLE_VOLUME_ML,
  LOTUS_DROPPER_DEFINITIONS,
  lotusDropsPerMl,
  lotusPublishedDrops,
  lotusRecipeById,
  lotusStockPlan,
} from './lotusConcentrate';

describe('DIY Lotus Drops calculations', () => {
  it('maps the four commercial droppers to the expected salts', () => {
    expect(LOTUS_DROPPER_DEFINITIONS.map(dropper => [dropper.id, dropper.saltId])).toEqual([
      ['magnesium', 'mgcl2'],
      ['calcium', 'cacl2'],
      ['potassium', 'khco3'],
      ['sodium', 'nahco3'],
    ]);
  });

  it('matches the Lotus 450 mL drop model for both styles', () => {
    const rao = lotusRecipeById('lotus-raos-recipe');

    expect(lotusPublishedDrops(rao, 'round')).toEqual({
      magnesium: 2,
      calcium: 2,
      potassium: 1,
      sodium: 1,
    });
    expect(lotusPublishedDrops(rao, 'straight')).toEqual({
      magnesium: 3,
      calcium: 4,
      potassium: 2,
      sodium: 2,
    });
  });

  it('keeps the inferred chemistry strength shared across style factors', () => {
    const magnesium = LOTUS_DROPPER_DEFINITIONS[0];
    const round = lotusStockPlan(magnesium, 'round');
    const straight = lotusStockPlan(magnesium, 'straight');

    expect(lotusDropsPerMl('round')).toBeCloseTo(11.2, 8);
    expect(lotusDropsPerMl('straight')).toBeCloseTo(20, 8);
    expect(round.saltMgPerMl).toBeCloseTo(straight.saltMgPerMl, 8);
    expect(round.saltMassG).toBeCloseTo(10.7953, 3);
    expect(round.stockVolumeMl).toBe(LOTUS_BOTTLE_VOLUME_ML);
  });

  it('supports an editable calibrated straight-drop baseline', () => {
    const potassium = LOTUS_DROPPER_DEFINITIONS.find(dropper => dropper.id === 'potassium')!;
    const plan = lotusStockPlan(potassium, 'round', 100, 18);

    expect(plan.dropsPerMl).toBeCloseTo(10.08, 8);
    expect(plan.stockVolumeMl).toBe(100);
    expect(plan.saltMassG).toBeGreaterThan(0);
  });
});