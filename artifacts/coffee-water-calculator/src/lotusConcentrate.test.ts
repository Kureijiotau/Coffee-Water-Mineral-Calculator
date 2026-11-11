import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LotusMassPreparationPanel } from './LotusMassPreparationPanel';
import { LotusInlineStockPreparation } from './LotusInlineStockPreparation';
import {
  LOTUS_BOTTLE_VOLUME_ML,
  LOTUS_DROPPER_DEFINITIONS,
  LOTUS_SOURCE_DROP_MASS_MG,
  calculateLotusDiyRecipeDoses,
  lotusCalibratedStockPlan,
  lotusDropsPerMl,
  lotusMeasuredDropsPerMl,
  migrateLotusCalibrationInputs,
  lotusPublishedDrops,
  lotusRecipeById,
  lotusStraightBaselineFromMeasuredRate,
  lotusMassStockPlan,
  lotusStockPlan,
} from './lotusConcentrate';
import { LOTUS_RECIPES } from './lotusRecipes';

// Fixed independent mass-balance references from Lotus's published ion inputs,
// average drop masses, 0.56 Round factor, and the selected salt hydration forms.
// Lotus does not publish proprietary bottle ratios; these fixtures protect the
// app's stated public-data estimate rather than claiming exact bottle contents.
const STOCK_PREPARATION_FIXTURES = [
  {
    id: 'magnesium',
    saltToWaterRatio: 0.296075353973,
    amounts: {
      20: ['4.569', '15.431'],
      100: ['22.844', '77.156'],
      250: ['57.110', '192.890'],
    },
  },
  {
    id: 'calcium',
    saltToWaterRatio: 0.197871709691,
    amounts: {
      20: ['3.304', '16.696'],
      100: ['16.519', '83.481'],
      250: ['41.297', '208.703'],
    },
  },
  {
    id: 'potassium',
    saltToWaterRatio: 0.126754757583,
    amounts: {
      20: ['2.250', '17.750'],
      100: ['11.250', '88.750'],
      250: ['28.124', '221.876'],
    },
  },
  {
    id: 'sodium',
    saltToWaterRatio: 0.104228876194,
    amounts: {
      20: ['1.888', '18.112'],
      100: ['9.439', '90.561'],
      250: ['23.598', '226.402'],
    },
  },
  {
    id: 'bonus-epsom',
    saltToWaterRatio: 0.383033010248,
    amounts: {
      20: ['5.539', '14.461'],
      100: ['27.695', '72.305'],
      250: ['69.238', '180.762'],
    },
  },
] as const;

describe('Lotus stock preparation reference checks', () => {
  it('matches independent salt-to-water and finished-mass fixtures for every dropper', () => {
    expect(STOCK_PREPARATION_FIXTURES.map(fixture => fixture.id)).toEqual(
      LOTUS_DROPPER_DEFINITIONS.map(dropper => dropper.id),
    );

    for (const fixture of STOCK_PREPARATION_FIXTURES) {
      const dropper = LOTUS_DROPPER_DEFINITIONS.find(item => item.id === fixture.id)!;

      for (const [finishedMass, [expectedSalt, expectedWater]] of Object.entries(fixture.amounts)) {
        const plan = lotusMassStockPlan(dropper, Number(finishedMass));
        expect(plan.valid).toBe(true);
        if (!plan.valid) continue;

        expect(plan.saltMassG / plan.waterMassG).toBeCloseTo(fixture.saltToWaterRatio, 10);
        expect(plan.saltMassG).toBeCloseTo(Number(expectedSalt), 2);
        expect(plan.waterMassG).toBeCloseTo(Number(expectedWater), 2);
        expect(plan.saltMassG + plan.waterMassG).toBeCloseTo(Number(finishedMass), 10);
        expect(plan.saltMassG.toFixed(3)).toBe(expectedSalt);
        expect(plan.waterMassG.toFixed(3)).toBe(expectedWater);
      }
    }
  });

  it('renders the fixture amounts and identifies the optional Epsom reference separately', () => {
    for (const fixture of STOCK_PREPARATION_FIXTURES) {
      const dropper = LOTUS_DROPPER_DEFINITIONS.find(item => item.id === fixture.id)!;
      for (const [finishedMass, [expectedSalt, expectedWater]] of Object.entries(fixture.amounts)) {
        const markup = renderToStaticMarkup(createElement(LotusMassPreparationPanel, {
          dropper,
          style: 'straight',
          calibration: { dropsInput: '100', weightInput: '5', style: 'straight' },
          massInput: finishedMass,
          onMassInputChange: () => {},
        }));

        expect(markup).toContain(`data-testid="lotus-stock-salt-mass">${expectedSalt} <span`);
        expect(markup).toContain(`data-testid="lotus-stock-water-mass">${expectedWater} <span`);
        expect(markup).toContain('data-testid="lotus-selected-stock-preparation"');
        if (fixture.id === 'bonus-epsom') {
          expect(markup).toContain('Optional Epsom reference · not Lotus');
          expect(markup).toContain('Epsom is not a Lotus product.');
        }
      }
    }
  });

  it('rejects non-positive and non-finite finished stock weights', () => {
    const magnesium = LOTUS_DROPPER_DEFINITIONS.find(dropper => dropper.id === 'magnesium')!;
    for (const finishedMass of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(lotusMassStockPlan(magnesium, finishedMass)).toEqual({
        valid: false,
        reason: 'Enter a positive finished stock weight.',
      });
    }
  });

  it('hides stock amounts and preparation steps for blank or invalid weights', () => {
    const magnesium = LOTUS_DROPPER_DEFINITIONS.find(dropper => dropper.id === 'magnesium')!;
    for (const massInput of ['', '   ', '0', '-1', 'NaN', 'Infinity', '-Infinity']) {
      const markup = renderToStaticMarkup(createElement(LotusMassPreparationPanel, {
        dropper: magnesium,
        style: 'straight',
        calibration: { dropsInput: '100', weightInput: '5', style: 'straight' },
        massInput,
        onMassInputChange: () => {},
      }));

      expect(markup).not.toContain('data-testid="lotus-finished-stock-amounts"');
      expect(markup).not.toContain('data-testid="lotus-stock-salt-mass"');
      expect(markup).not.toContain('data-testid="lotus-stock-water-mass"');
      expect(markup).not.toContain('data-testid="lotus-selected-stock-preparation"');
    }
  });

  it('renders inline stock amounts from the same independent fixtures', () => {
    for (const fixture of STOCK_PREPARATION_FIXTURES) {
      const dropper = LOTUS_DROPPER_DEFINITIONS.find(item => item.id === fixture.id)!;
      for (const [finishedMass, [expectedSalt, expectedWater]] of Object.entries(fixture.amounts)) {
        const markup = renderToStaticMarkup(createElement(LotusInlineStockPreparation, {
          dropper,
          style: 'straight',
          isCalibrated: true,
          massInput: finishedMass,
          onMassInputChange: () => {},
        }));

        expect(markup).toContain(`data-testid="lotus-stock-salt-mass">${expectedSalt} g</strong>`);
        expect(markup).toContain(`data-testid="lotus-stock-water-mass">${expectedWater} g</strong>`);
        if (fixture.id === 'bonus-epsom') {
          expect(markup).toContain('Optional Epsom reference · not Lotus');
          expect(markup).toContain('Epsom is not a Lotus product.');
        }
      }
    }
  });
});

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

  it('updates calibrated ppm per drop while preserving each fixed Lotus reference', () => {
    const calibration = {
      dropsInput: '100',
      weightInput: '4',
      style: 'straight' as const,
    };

    for (const dropper of LOTUS_DROPPER_DEFINITIONS) {
      const estimated = lotusCalibratedStockPlan(dropper, 'straight', 59, 20);
      const calibrated = lotusCalibratedStockPlan(dropper, 'straight', 59, 20, calibration);

      expect(calibrated.dropsPerMl).toBe(25);
      expect(calibrated.saltMassG).toBeCloseTo(estimated.saltMassG, 10);
      expect(calibrated.lotusReferenceIonPpmPerDrop).toBe(estimated.lotusReferenceIonPpmPerDrop);
      expect(calibrated.ionPpmPerDrop).not.toBeCloseTo(estimated.ionPpmPerDrop, 8);
    }
  });

  it('keeps the Lotus source-drop reference separate from calibrated dropper output', () => {
    const magnesium = LOTUS_DROPPER_DEFINITIONS.find(dropper => dropper.id === 'magnesium')!;
    const straight = lotusStockPlan(magnesium, 'straight');
    const round = lotusStockPlan(magnesium, 'round');
    const calibrated = lotusCalibratedStockPlan(magnesium, 'straight', 59, 20, {
      dropsInput: '100',
      weightInput: '4',
      style: 'straight',
    });

    expect(straight).toHaveProperty('lotusReferenceIonPpmPerDrop');
    expect(straight).toHaveProperty('lotusReferenceSaltMgPerDrop');
    expect(straight.lotusReferenceIonPpmPerDrop).toBeCloseTo(2.4305, 6);
    expect(straight.lotusReferenceSaltMgPerDrop).toBeCloseTo(9.148545, 6);
    expect(round.lotusReferenceIonPpmPerDrop).toBeCloseTo(2.4305 / 0.56, 6);
    expect(round.lotusReferenceSaltMgPerDrop).toBeCloseTo(9.148545 / 0.56, 6);
    expect(calibrated.lotusReferenceIonPpmPerDrop).toBe(straight.lotusReferenceIonPpmPerDrop);
    expect(calibrated.lotusReferenceSaltMgPerDrop).toBe(straight.lotusReferenceSaltMgPerDrop);
    expect(calibrated.ionPpmPerDrop).not.toBeCloseTo(straight.ionPpmPerDrop, 4);
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

describe('DIY Lotus published-recipe doses', () => {
  const publishedCounts = {
    'lotus-light-and-bright': {
      round: { magnesium: 0, calcium: 3, potassium: 3, sodium: 0 },
      straight: { magnesium: 0, calcium: 6, potassium: 5, sodium: 0 },
    },
    'lotus-simple-and-sweet': {
      round: { magnesium: 2, calcium: 3, potassium: 2, sodium: 3 },
      straight: { magnesium: 3, calcium: 6, potassium: 3, sodium: 5 },
    },
    'lotus-light-and-bright-espresso': {
      round: { magnesium: 1, calcium: 0, potassium: 5, sodium: 0 },
      straight: { magnesium: 2, calcium: 0, potassium: 9, sodium: 0 },
    },
    'lotus-simple-and-sweet-espresso': {
      round: { magnesium: 1, calcium: 0, potassium: 0, sodium: 6 },
      straight: { magnesium: 2, calcium: 0, potassium: 0, sodium: 11 },
    },
    'lotus-bright-and-juicy': {
      round: { magnesium: 2, calcium: 2, potassium: 1, sodium: 1 },
      straight: { magnesium: 4, calcium: 4, potassium: 2, sodium: 2 },
    },
    'lotus-raos-recipe': {
      round: { magnesium: 2, calcium: 2, potassium: 1, sodium: 1 },
      straight: { magnesium: 3, calcium: 4, potassium: 2, sodium: 2 },
    },
    'lotus-ultra-light': {
      round: { magnesium: 1, calcium: 1, potassium: 1, sodium: 0 },
      straight: { magnesium: 2, calcium: 2, potassium: 2, sodium: 0 },
    },
  } as const;

  it('matches all seven published 450 mL drop counts with Lotus reference drop weights', () => {
    expect(LOTUS_RECIPES.map(recipe => recipe.id)).toEqual(Object.keys(publishedCounts));

    for (const recipe of LOTUS_RECIPES) {
      for (const style of ['round', 'straight'] as const) {
        const plan = calculateLotusDiyRecipeDoses(recipe, style, 450);
        expect(plan.counts).toEqual(publishedCounts[recipe.id as keyof typeof publishedCounts][style]);
        expect(plan.dropMassSource).toBe('lotus-reference');
      }
    }
  });

  it('uses the measured mass per drop for the selected style', () => {
    const rao = LOTUS_RECIPES.find(recipe => recipe.id === 'lotus-raos-recipe')!;
    const straight = calculateLotusDiyRecipeDoses(rao, 'straight', 450, {
      dropsInput: '100',
      weightInput: '8',
      style: 'straight',
    });
    const round = calculateLotusDiyRecipeDoses(rao, 'round', 450, {
      dropsInput: '100',
      weightInput: '5.6',
      style: 'round',
    });

    expect(straight).toEqual({
      counts: { magnesium: 2, calcium: 2, potassium: 1, sodium: 1 },
      dropMassSource: 'calibration',
      stockDropMassSources: {
        magnesium: 'calibration',
        calcium: 'calibration',
        potassium: 'calibration',
        sodium: 'calibration',
      },
    });
    expect(round).toEqual({
      counts: { magnesium: 2, calcium: 3, potassium: 1, sodium: 2 },
      dropMassSource: 'calibration',
      stockDropMassSources: {
        magnesium: 'calibration',
        calcium: 'calibration',
        potassium: 'calibration',
        sodium: 'calibration',
      },
    });
  });

  it('uses each valid finished-stock measurement only for that stock dose', () => {
    const recipe = LOTUS_RECIPES.find(item => item.id === 'lotus-simple-and-sweet')!;
    const plan = calculateLotusDiyRecipeDoses(recipe, 'straight', 450, {
      dropsInput: '100',
      weightInput: '5',
      style: 'straight',
    }, {
      magnesium: { dropsInput: '10', weightInput: '2' },
    });

    expect(plan.counts).toEqual({
      magnesium: 1,
      calcium: 5,
      potassium: 2,
      sodium: 4,
    });
    expect(plan.dropMassSource).toBe('mixed');
    expect(plan.stockDropMassSources).toEqual({
      magnesium: 'stock-measurement',
      calcium: 'calibration',
      potassium: 'calibration',
      sodium: 'calibration',
    });
  });

  it('rounds a calibrated dose across the calcium half-drop boundary', () => {
    const recipe = LOTUS_RECIPES.find(item => item.id === 'lotus-simple-and-sweet')!;
    const calibration = {
      dropsInput: '100',
      weightInput: '5',
      style: 'straight' as const,
    };

    expect(calculateLotusDiyRecipeDoses(recipe, 'straight', 46.81, calibration).counts.calcium).toBe(0);
    expect(calculateLotusDiyRecipeDoses(recipe, 'straight', 46.83, calibration).counts.calcium).toBe(1);
  });

  it('rounds a finished-stock dose across the calcium half-drop boundary', () => {
    const recipe = LOTUS_RECIPES.find(item => item.id === 'lotus-simple-and-sweet')!;
    const stockMeasurements = {
      calcium: { dropsInput: '10', weightInput: '2' },
    };

    expect(calculateLotusDiyRecipeDoses(
      recipe,
      'straight',
      187.26,
      undefined,
      stockMeasurements,
    ).counts.calcium).toBe(0);
    expect(calculateLotusDiyRecipeDoses(
      recipe,
      'straight',
      187.29,
      undefined,
      stockMeasurements,
    ).counts.calcium).toBe(1);
  });

  it('falls back to water calibration for invalid measurements on every finished stock', () => {
    const recipe = LOTUS_RECIPES.find(item => item.id === 'lotus-simple-and-sweet')!;
    const calibration = { dropsInput: '100', weightInput: '5', style: 'straight' as const };
    const stockIds = ['magnesium', 'calcium', 'potassium', 'sodium'] as const;
    const validMeasurements = {
      magnesium: { dropsInput: '10', weightInput: '2' },
      calcium: { dropsInput: '10', weightInput: '2' },
      potassium: { dropsInput: '10', weightInput: '2' },
      sodium: { dropsInput: '10', weightInput: '2' },
    };
    const invalidMeasurements = [
      { dropsInput: '', weightInput: '2' },
      { dropsInput: '0', weightInput: '2' },
      { dropsInput: '-1', weightInput: '2' },
      { dropsInput: 'NaN', weightInput: '2' },
      { dropsInput: 'Infinity', weightInput: '2' },
      { dropsInput: '-Infinity', weightInput: '2' },
      { dropsInput: '10', weightInput: '' },
      { dropsInput: '10', weightInput: '0' },
      { dropsInput: '10', weightInput: '-2' },
      { dropsInput: '10', weightInput: 'NaN' },
      { dropsInput: '10', weightInput: 'Infinity' },
      { dropsInput: '10', weightInput: '-Infinity' },
    ];

    for (const stockId of stockIds) {
      const measurementsWithoutStock = Object.fromEntries(
        stockIds
          .filter(id => id !== stockId)
          .map(id => [id, validMeasurements[id]]),
      );
      const expectedCounts = calculateLotusDiyRecipeDoses(
        recipe,
        'straight',
        450,
        calibration,
        measurementsWithoutStock,
      ).counts;

      for (const measurement of invalidMeasurements) {
        const plan = calculateLotusDiyRecipeDoses(recipe, 'straight', 450, calibration, {
          ...validMeasurements,
          [stockId]: measurement,
        });

        expect(plan.counts).toEqual(expectedCounts);
        expect(plan.dropMassSource).toBe('mixed');
        expect(plan.stockDropMassSources).toEqual({
          magnesium: stockId === 'magnesium' ? 'calibration' : 'stock-measurement',
          calcium: stockId === 'calcium' ? 'calibration' : 'stock-measurement',
          potassium: stockId === 'potassium' ? 'calibration' : 'stock-measurement',
          sodium: stockId === 'sodium' ? 'calibration' : 'stock-measurement',
        });
      }
    }
  });

  it('shows a valid stock measurement as active even when that recipe needs zero drops', () => {
    const recipe = LOTUS_RECIPES.find(item => item.id === 'lotus-light-and-bright')!;
    const plan = calculateLotusDiyRecipeDoses(recipe, 'straight', 450, undefined, {
      magnesium: { dropsInput: '10', weightInput: '2' },
    });

    expect(plan.counts.magnesium).toBe(0);
    expect(plan.stockDropMassSources.magnesium).toBe('stock-measurement');
  });

  it('uses Lotus reference weights when calibration is missing or incomplete', () => {
    const recipe = LOTUS_RECIPES.find(item => item.id === 'lotus-simple-and-sweet')!;
    const withoutCalibration = calculateLotusDiyRecipeDoses(recipe, 'straight', 450);
    const partialCalibration = calculateLotusDiyRecipeDoses(recipe, 'straight', 450, {
      dropsInput: '100',
      weightInput: '',
      style: 'straight',
    });

    expect(partialCalibration).toEqual(withoutCalibration);
    expect(partialCalibration.dropMassSource).toBe('lotus-reference');
  });

  it.each([
    { label: 'zero', brewVolumeMl: 0 },
    { label: 'negative', brewVolumeMl: -100 },
    { label: 'NaN', brewVolumeMl: Number.NaN },
    { label: 'positive infinity', brewVolumeMl: Number.POSITIVE_INFINITY },
    { label: 'negative infinity', brewVolumeMl: Number.NEGATIVE_INFINITY },
  ])('rejects a $label brew volume with the documented RangeError', ({ brewVolumeMl }) => {
    const recipe = LOTUS_RECIPES.find(item => item.id === 'lotus-simple-and-sweet')!;

    expect(() => calculateLotusDiyRecipeDoses(recipe, 'straight', brewVolumeMl))
      .toThrow(new RangeError('Brew-water volume must be a positive finite number.'));
  });

  it('scales counts with brew volume and returns whole nonnegative counts at the range limits', () => {
    const recipe = LOTUS_RECIPES.find(item => item.id === 'lotus-simple-and-sweet')!;

    expect(calculateLotusDiyRecipeDoses(recipe, 'straight', 900).counts).toEqual({
      magnesium: 6,
      calcium: 12,
      potassium: 6,
      sodium: 10,
    });

    for (const brewVolumeMl of [50, 2000]) {
      const counts = Object.values(calculateLotusDiyRecipeDoses(recipe, 'round', brewVolumeMl).counts);
      expect(counts).toHaveLength(4);
      expect(counts.every(count => Number.isFinite(count) && Number.isInteger(count) && count >= 0)).toBe(true);
    }
  });

  it('keeps the DIY stock strength ratio constant across prepared batch sizes', () => {
    const magnesium = LOTUS_DROPPER_DEFINITIONS.find(dropper => dropper.id === 'magnesium')!;
    const plans = [20, 100, 250].map(totalMassG => lotusMassStockPlan(magnesium, totalMassG));

    expect(plans.every(plan => plan.valid)).toBe(true);
    const strengths = plans.flatMap(plan => plan.valid ? [plan.saltMgPerStockG] : []);
    expect(strengths[1]).toBeCloseTo(strengths[0], 10);
    expect(strengths[2]).toBeCloseTo(strengths[0], 10);
  });
});