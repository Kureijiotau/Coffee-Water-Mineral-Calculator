import { describe, expect, it } from 'vitest';
import {
  LOTUS_BOTTLE_VOLUME_ML,
  LOTUS_DROPPER_DEFINITIONS,
  LOTUS_SOURCE_DROP_MASS_MG,
  lotusCalibratedStockPlan,
  lotusDropsPerMl,
  lotusMeasuredDropsPerMl,
  migrateLotusCalibrationInputs,
  lotusPublishedDrops,
  lotusRecipeById,
  lotusStraightBaselineFromMeasuredRate,
  lotusStockPlan,
} from './lotusConcentrate';

describe('DIY Lotus Drops calculations', () => {
  it('maps the four commercial droppers to the expected salts', () => {
    expect(LOTUS_DROPPER_DEFINITIONS.filter(dropper => !dropper.isBonus).map(dropper => [dropper.id, dropper.saltId])).toEqual([
      ['magnesium', 'mgcl2'],
      ['calcium', 'cacl2'],
      ['potassium', 'khco3'],
      ['sodium', 'nahco3'],
    ]);
  });

  it('defines the optional bonus Epsom dropper with the default heptahydrate form', () => {
    const epsom = LOTUS_DROPPER_DEFINITIONS.find(dropper => dropper.id === 'bonus-epsom')!;
    const plan = lotusStockPlan(epsom, 'straight');

    expect(epsom.isBonus).toBe(true);
    expect(epsom.saltId).toBe('mgso4');
    expect(plan.hydrationForm).toBe('Heptahydrate (Epsom)');
    expect(plan.saltMgPerMl).toBeGreaterThan(0);
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
    const sourceStraightSaltMgPerDrop = 9.148545;
    const sourceRoundSaltMgPerDrop = sourceStraightSaltMgPerDrop / 0.56;
    const estimatedSaltMgPerGramWater = (
      sourceStraightSaltMgPerDrop / (LOTUS_SOURCE_DROP_MASS_MG.straight - sourceStraightSaltMgPerDrop)
      + sourceRoundSaltMgPerDrop / (LOTUS_SOURCE_DROP_MASS_MG.round - sourceRoundSaltMgPerDrop)
    ) / 2 * 1000;

    expect(lotusDropsPerMl('round')).toBeCloseTo(11.2, 8);
    expect(lotusDropsPerMl('straight')).toBeCloseTo(20, 8);
    expect(LOTUS_SOURCE_DROP_MASS_MG).toEqual({ round: 71.6, straight: 40 });
    expect(round.saltMgPerMl).toBeCloseTo(straight.saltMgPerMl, 8);
    expect(round.saltMgPerMl).toBeCloseTo(estimatedSaltMgPerGramWater, 6);
    expect(round.saltMgPerDrop).toBeCloseTo(round.saltMgPerMl / round.dropsPerMl, 8);
    expect(straight.saltMgPerDrop).toBeCloseTo(straight.saltMgPerMl / straight.dropsPerMl, 8);
    expect(round.ionPpmPerDrop).toBeCloseTo(7.02308349, 6);
    expect(straight.ionPpmPerDrop).toBeCloseTo(3.93292675, 6);
    expect(round.saltMassG).toBeCloseTo(17.4684, 3);
    expect(round.stockVolumeMl).toBe(LOTUS_BOTTLE_VOLUME_ML);
  });

  it('keeps the public-data salt estimate independent of the editable drop-rate baseline', () => {
    const potassium = LOTUS_DROPPER_DEFINITIONS.find(dropper => dropper.id === 'potassium')!;
    const plan = lotusStockPlan(potassium, 'round', 100, 18);
    const nominalPlan = lotusStockPlan(potassium, 'round', 100, 20);

    expect(plan.dropsPerMl).toBeCloseTo(10.08, 8);
    expect(plan.stockVolumeMl).toBe(100);
    expect(plan.saltMgPerMl).toBeCloseTo(nominalPlan.saltMgPerMl, 8);
    expect(plan.saltMassG).toBeCloseTo(nominalPlan.saltMassG, 8);
    expect(plan.saltMgPerDrop).toBeCloseTo(plan.saltMgPerMl / plan.dropsPerMl, 8);
    expect(plan.saltMassG).toBeGreaterThan(0);
  });

  it('uses one style- and calibration-independent stock-mass estimate for all four Lotus salts', () => {
    const commercialDroppers = LOTUS_DROPPER_DEFINITIONS.filter(dropper => !dropper.isBonus);
    expect(commercialDroppers.map(dropper => dropper.id)).toEqual([
      'magnesium',
      'calcium',
      'potassium',
      'sodium',
    ]);

    for (const dropper of commercialDroppers) {
      const round = lotusStockPlan(dropper, 'round', 59, 18);
      const straight = lotusStockPlan(dropper, 'straight', 59, 25);

      expect(round.saltMassG).toBeGreaterThan(0);
      expect(round.saltMgPerMl).toBeCloseTo(straight.saltMgPerMl, 8);
      expect(round.saltMassG).toBeCloseTo(straight.saltMassG, 8);
    }
  });

  it('converts a measured rate to a straight-drop baseline using the measured tip style', () => {
    expect(lotusStraightBaselineFromMeasuredRate(11.2, 'round')).toBeCloseTo(20, 8);
    expect(lotusStraightBaselineFromMeasuredRate(20, 'straight')).toBeCloseTo(20, 8);
    expect(lotusStraightBaselineFromMeasuredRate(0, 'round', 18)).toBe(18);
  });

  it('uses calibration for per-drop values without changing stock chemistry', () => {
    const magnesium = LOTUS_DROPPER_DEFINITIONS.find(dropper => dropper.id === 'magnesium')!;
    const calcium = LOTUS_DROPPER_DEFINITIONS.find(dropper => dropper.id === 'calcium')!;
    const magnesiumPlan = lotusCalibratedStockPlan(magnesium, 'round', 59, 20, {
      dropsInput: '60',
      weightInput: '5',
      style: 'round',
    });
    const calciumPlan = lotusCalibratedStockPlan(calcium, 'straight', 59, 20, {
      dropsInput: '100',
      weightInput: '4',
      style: 'straight',
    });

    expect(magnesiumPlan.dropsPerMl).toBeCloseTo(12, 8);
    expect(calciumPlan.dropsPerMl).toBeCloseTo(25, 8);
    expect(magnesiumPlan.saltMgPerMl).toBeCloseTo(lotusStockPlan(magnesium, 'round').saltMgPerMl, 8);
    expect(calciumPlan.saltMgPerMl).toBeCloseTo(lotusStockPlan(calcium, 'straight').saltMgPerMl, 8);
    expect(magnesiumPlan.saltMassG).toBeCloseTo(lotusStockPlan(magnesium, 'round').saltMassG, 8);
    expect(calciumPlan.saltMassG).toBeCloseTo(lotusStockPlan(calcium, 'straight').saltMassG, 8);
    expect(magnesiumPlan.saltMgPerDrop).toBeCloseTo(
      magnesiumPlan.saltMgPerMl / magnesiumPlan.dropsPerMl,
      8,
    );
    expect(calciumPlan.saltMgPerDrop).toBeCloseTo(
      calciumPlan.saltMgPerMl / calciumPlan.dropsPerMl,
      8,
    );
  });

  it('keeps equal salt amounts for Round and Straight at equal measured rates', () => {
    const magnesium = LOTUS_DROPPER_DEFINITIONS.find(dropper => dropper.id === 'magnesium')!;
    const roundPlan = lotusCalibratedStockPlan(magnesium, 'round', 1, 20, {
      dropsInput: '100',
      weightInput: '5',
      style: 'round',
    });
    const straightPlan = lotusCalibratedStockPlan(magnesium, 'straight', 1, 20, {
      dropsInput: '100',
      weightInput: '5',
      style: 'straight',
    });

    expect(roundPlan.dropsPerMl).toBe(20);
    expect(straightPlan.dropsPerMl).toBe(20);
    expect(roundPlan.saltMgPerMl).toBeCloseTo(straightPlan.saltMgPerMl, 8);
    expect(roundPlan.saltMassG).toBeCloseTo(straightPlan.saltMassG, 8);
    expect(roundPlan.saltMgPerDrop).toBeCloseTo(straightPlan.saltMgPerDrop, 8);
  });

  it('applies one shared style calibration to every Lotus stock plan', () => {
    const calibration = { dropsInput: '60', weightInput: '5', style: 'round' as const };
    const plans = LOTUS_DROPPER_DEFINITIONS.map(dropper =>
      lotusCalibratedStockPlan(dropper, 'round', 59, 20, calibration),
    );

    expect(plans.map(plan => plan.dropsPerMl)).toEqual([12, 12, 12, 12, 12]);
    expect(lotusMeasuredDropsPerMl(calibration)).toBe(12);
  });

  it('promotes one or identical legacy measurements into a shared style calibration', () => {
    const migration = migrateLotusCalibrationInputs({
      magnesium: { dropsInput: '60', weightInput: '5', style: 'round' },
      calcium: { dropsInput: '120', weightInput: '10', style: 'round' },
      sodium: { dropsInput: '100', weightInput: '4', style: 'straight' },
    });

    expect(migration.calibrations).toEqual({
      round: { dropsInput: '60', weightInput: '5', style: 'round' },
      straight: { dropsInput: '100', weightInput: '4', style: 'straight' },
    });
    expect(migration.conflicts).toEqual({});
    expect(migration.legacyInputs).toEqual({});
  });

  it('keeps conflicting and unassigned legacy measurements available for resolution', () => {
    const legacyInputs = {
      magnesium: { dropsInput: '60', weightInput: '5', style: 'round' as const },
      calcium: { dropsInput: '70', weightInput: '5', style: 'round' as const },
      potassium: { dropsInput: '80', weightInput: '4' },
    };
    const migration = migrateLotusCalibrationInputs(legacyInputs);

    expect(migration.calibrations.round).toBeUndefined();
    expect(migration.conflicts.round?.map(candidate => candidate.id)).toEqual([
      'magnesium',
      'calcium',
    ]);
    expect(migration.unassigned.map(candidate => candidate.id)).toEqual(['potassium']);
    expect(migration.legacyInputs).toEqual(legacyInputs);
  });

  it('preserves a single incomplete legacy measurement so the user can finish it', () => {
    const migration = migrateLotusCalibrationInputs({
      magnesium: { dropsInput: '60', weightInput: '', style: 'round' },
    });

    expect(migration.calibrations.round).toEqual({
      dropsInput: '60',
      weightInput: '',
      style: 'round',
    });
    expect(lotusMeasuredDropsPerMl(migration.calibrations.round)).toBeNull();
    expect(migration.legacyInputs).toEqual({});
  });

  it('uses the default calibration when either measurement is missing or invalid', () => {
    const magnesium = LOTUS_DROPPER_DEFINITIONS.find(dropper => dropper.id === 'magnesium')!;
    const fallback = lotusStockPlan(magnesium, 'straight');

    expect(lotusCalibratedStockPlan(magnesium, 'straight', 59, 20, {
      dropsInput: '100',
      weightInput: '',
      style: 'straight',
    })).toEqual(fallback);
    expect(lotusCalibratedStockPlan(magnesium, 'straight', 59, 20, {
      dropsInput: '-100',
      weightInput: '-5',
      style: 'straight',
    })).toEqual(fallback);
  });
});