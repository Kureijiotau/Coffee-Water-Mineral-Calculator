import { describe, expect, it } from 'vitest';
import {
  createWaterPlan,
  isValidWaterPlan,
  parseWaterPlanFile,
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
  watermancerUsedSaltIds: ['mgso4'],
  autoCraftPreset: 'closest-match',
  watermancerSaltObjective: 'balanced',
  watermancerBestMatchDeviationMode: 'strict',
  watermancerIonSourcePreferences: { calcium: 'water-then-salt' },
  watermancerDoseOverridesMg: { mgso4: 25 },
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
  });

  it('rejects files with the wrong kind or version', () => {
    expect(parseWaterPlanFile(JSON.stringify({ kind: 'coffee-water-recipe', version: 1 }))).toBeNull();
    expect(parseWaterPlanFile(JSON.stringify({ kind: 'coffee-water-plan', version: 99 }))).toBeNull();
  });
});