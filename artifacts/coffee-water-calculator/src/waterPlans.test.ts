import { describe, expect, it } from 'vitest';
import {
  createWaterPlan,
  isValidWaterPlan,
  parseWaterRecipeFile,
  parseWaterPlanFile,
  resolveWaterPlanCalculatorMode,
  serializeWaterRecipeFile,
  serializeWaterPlanFile,
  type WaterPlanSnapshot,
} from './waterPlans';

const snapshot: WaterPlanSnapshot = {
  version: 1,
  appTab: 'calculator',
  nerdLevel: 'watermancer',
  liters: '1.5',
  volumeUnit: 'liters',
  rows: [{ target: '12', formIdx: 0 }],
  mineralWaters: [],
  additionWaters: [],
  magnesiumPreference: 'original',
  autoFillPriorityPreset: 'mineral-first',
  autoFillCustomPriority: ['calcium', 'magnesium'],
  autoFillDeviationPpm: 0,
  overshootSettings: {
    enabled: true,
    allowedIons: ['calcium'],
    limits: { calcium: 10 },
  },
  brewerDropsPerMl: 20,
  brewerFlavor: {
    brightness: 70,
    body: 35,
    juiciness: 65,
    sweetness: 55,
  },
  brewerRecipeOverride: null,
  externalRecipeId: 'custom',
  activeRecipeId: 'custom',
  activeProfileId: 'aiki-default',
  watermancerTargetSource: 'safe-profile',
  watermancerTargetOverride: { calcium: 40 },
  watermancerStrengthPercent: 135,
  watermancerUsedSaltIds: ['mgso4'],
  autoCraftPreset: 'closest-match',
  watermancerSaltObjective: 'balanced',
  watermancerMatchingMode: 'target-values',
  watermancerBestMatchDeviationMode: 'strict',
  watermancerIonSourcePreferences: { calcium: 'water-then-salt' },
  watermancerDoseOverridesMg: { mgso4: 25 },
  watermancerSilicaDrops: 3,
  watermancerSilicaTargetEnabled: true,
  watermancerSilicaTargetPpm: '25',
  sodiumCorrectionOn: false,
  concentrateRecipeHandoff: null,
  concentrate: {
    mode: 'builder',
    saltId: 'mgso4',
    formIdx: 0,
    strengthInput: '5',
    totalStockMassInput: '50',
    calibrationDrops: '100',
    calibrationStockMass: '5',
    targetSaltMass: '40',
    doseDrops: '1',
    doseLiters: '1',
    dropperStyle: 'straight',
    straightDropsPerMlInput: '20',
    recipeConcentratePlan: null,
  },
};

describe('water plan persistence', () => {
  it('creates a valid named snapshot', () => {
    const plan = createWaterPlan('Bright washed', snapshot, '2026-08-15T00:00:00.000Z');

    expect(plan.name).toBe('Bright washed');
    expect(plan.createdAt).toBe('2026-08-15T00:00:00.000Z');
    expect(isValidWaterPlan(plan)).toBe(true);
  });

  it('round-trips a plan through the shareable JSON format', () => {
    const plan = createWaterPlan('Bright washed', snapshot, '2026-08-15T00:00:00.000Z');
    const parsed = parseWaterPlanFile(serializeWaterPlanFile(plan));

    expect(parsed).not.toBeNull();
    expect(parsed?.id).not.toBe(plan.id);
    expect(parsed?.name).toBe(plan.name);
    expect(parsed?.snapshot).toEqual(snapshot);
    expect(parsed?.snapshot.watermancerSilicaDrops).toBe(3);
    expect(parsed?.snapshot.watermancerSilicaTargetEnabled).toBe(true);
    expect(parsed?.snapshot.watermancerSilicaTargetPpm).toBe('25');
    expect(parsed?.snapshot.watermancerStrengthPercent).toBe(135);
  });

  it('round-trips an explicit Brewer mode in a version-1 plan', () => {
    const brewerSnapshot = {
      ...snapshot,
      nerdLevel: 'alchemist',
      calculatorMode: 'brewer',
    } as unknown as WaterPlanSnapshot;
    const parsed = parseWaterPlanFile(serializeWaterPlanFile(createWaterPlan('Brewer plan', brewerSnapshot)));

    expect(parsed?.snapshot.calculatorMode).toBe('brewer');
    expect(resolveWaterPlanCalculatorMode(parsed!.snapshot)).toBe('brewer');
  });

  it('rejects an invalid modern calculator mode', () => {
    const invalidSnapshot = {
      ...snapshot,
      calculatorMode: 'legacy-brewer',
    } as unknown as WaterPlanSnapshot;

    expect(isValidWaterPlan(createWaterPlan('Invalid mode', invalidSnapshot))).toBe(false);
  });

  it('keeps a legacy Brewer snapshot valid but resolves it to Alchemist', () => {
    const legacySnapshot = {
      ...snapshot,
      nerdLevel: 'brewer',
    };
    const plan = createWaterPlan('Legacy Brewer', legacySnapshot);

    expect(isValidWaterPlan(plan)).toBe(true);
    expect(resolveWaterPlanCalculatorMode(plan.snapshot)).toBe('alchemist');
  });

  it.each(['brewer', 'alchemist', 'watermancer'] as const)(
    'honors the explicit %s mode over legacy mode',
    mode => {
      const explicitSnapshot = {
        ...snapshot,
        nerdLevel: 'brewer',
        calculatorMode: mode,
      } as unknown as WaterPlanSnapshot;

      expect(resolveWaterPlanCalculatorMode(explicitSnapshot)).toBe(mode);
    },
  );

  it('accepts legacy snapshots without a matching mode and leaves them on target values', () => {
    const legacySnapshot = { ...snapshot };
    delete legacySnapshot.watermancerMatchingMode;
    delete legacySnapshot.watermancerStrengthPercent;
    const plan = createWaterPlan('Legacy', legacySnapshot, '2026-08-15T00:00:00.000Z');

    expect(isValidWaterPlan(plan)).toBe(true);
    expect((plan.snapshot.watermancerMatchingMode ?? 'target-values')).toBe('target-values');
    expect(plan.snapshot.watermancerStrengthPercent).toBeUndefined();
  });

  it('rejects target-strength percentages outside the supported scale', () => {
    const plan = createWaterPlan('Invalid strength', {
      ...snapshot,
      watermancerStrengthPercent: 205,
    }, '2026-08-15T00:00:00.000Z');

    expect(isValidWaterPlan(plan)).toBe(false);
  });

  it('accepts legacy snapshots without a silica dose and rejects invalid counts', () => {
    const legacySnapshot = { ...snapshot };
    delete legacySnapshot.watermancerSilicaDrops;
    delete legacySnapshot.watermancerSilicaTargetEnabled;
    delete legacySnapshot.watermancerSilicaTargetPpm;
    expect(isValidWaterPlan(createWaterPlan('Legacy silica', legacySnapshot))).toBe(true);
    expect(isValidWaterPlan(createWaterPlan('Invalid silica', {
      ...snapshot,
      watermancerSilicaDrops: -1,
    }))).toBe(false);
    expect(isValidWaterPlan(createWaterPlan('Fractional silica', {
      ...snapshot,
      watermancerSilicaDrops: 1.5,
    }))).toBe(false);
    expect(isValidWaterPlan(createWaterPlan('Invalid silica target toggle', {
      ...snapshot,
      watermancerSilicaTargetEnabled: 'yes' as unknown as boolean,
    }))).toBe(false);
  });

  it('rejects files with the wrong kind or version', () => {
    expect(parseWaterPlanFile(JSON.stringify({ kind: 'coffee-water-recipe', version: 1 }))).toBeNull();
    expect(parseWaterPlanFile(JSON.stringify({ kind: 'coffee-water-plan', version: 99 }))).toBeNull();
  });

  it('serializes only a named recipe and its ion targets', () => {
    const parsed = JSON.parse(serializeWaterRecipeFile('Bright washed', {
      calcium: 40,
      magnesium: 12.5,
      chloride: 0,
      invalid: Number.NaN,
    }));

    expect(parsed).toEqual({
      kind: 'coffee-water-recipe',
      version: 1,
      name: 'Bright washed',
      ions: { calcium: 40, magnesium: 12.5, chloride: 0 },
    });
  });

  it('round-trips an optional target profile with a recipe share', () => {
    const profile = {
      id: 'aiki-default',
      name: 'Aiki safe profile',
      source: 'Built-in safe profile',
      details: 'Published conservative ceilings for coffee water.',
      targets: { calcium: 40, magnesium: 12, chloride: 0 },
    };
    const parsed = parseWaterRecipeFile(serializeWaterRecipeFile(
      'Bright washed',
      { calcium: 40, magnesium: 12 },
      profile,
    ));

    expect(parsed?.profile).toEqual(profile);
  });

  it('reads a recipe-only share file without accepting extra plan state', () => {
    const parsed = parseWaterRecipeFile(JSON.stringify({
      kind: 'coffee-water-recipe',
      version: 1,
      name: 'Bright washed',
      ions: { calcium: 40, magnesium: 12.5 },
      waters: [{ name: 'ignored' }],
    }));

    expect(parsed).toEqual({
      kind: 'coffee-water-recipe',
      version: 1,
      name: 'Bright washed',
      ions: { calcium: 40, magnesium: 12.5 },
    });
  });
});