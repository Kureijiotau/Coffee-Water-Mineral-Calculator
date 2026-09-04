import type { NerdLevel } from './profiles';
import type { SaltRecipeEntry } from './waterData';
import type { WatermancerMatchingMode } from './watermancerPlan';

export type WaterPlanVolumeUnit = 'liters' | 'gallons';

export type WaterPlanSaltRow = {
  target: string;
  formIdx: number;
};

export type WaterPlanWaterEntry = {
  id: string;
  name: string;
  ions: Record<string, string>;
  metadata: Record<string, string>;
  volumeMl: string;
  sourceLocalId?: string;
};

export type WaterPlanConcentrateSnapshot = {
  mode: 'builder' | 'lotus';
  saltId: string;
  formIdx: number;
  strengthInput: string;
  totalStockMassInput: string;
  calibrationDrops: string;
  calibrationStockMass: string;
  targetSaltMass: string;
  doseDrops: string;
  doseLiters: string;
  dropperStyle: 'round' | 'straight';
  straightDropsPerMlInput: string;
  recipeConcentratePlan: unknown | null;
};

export type WaterPlanSnapshot = {
  version: 1;
  appTab: 'calculator' | 'concentrate';
  nerdLevel: NerdLevel;
  liters: string;
  volumeUnit: WaterPlanVolumeUnit;
  rows: WaterPlanSaltRow[];
  mineralWaters: WaterPlanWaterEntry[];
  additionWaters: WaterPlanWaterEntry[];
  magnesiumPreference: 'original' | 'chlorides' | 'sulfates';
  autoFillPriorityPreset: string;
  autoFillCustomPriority: string[];
  autoFillDeviationPpm: number;
  overshootSettings: {
    enabled: boolean;
    allowedIons: string[];
    limits: Record<string, number>;
  };
  brewerDropsPerMl: number;
  brewerFlavor: {
    brightness: number;
    body: number;
    juiciness: number;
    sweetness: number;
  };
  brewerRecipeOverride: unknown | null;
  externalRecipeId: string;
  activeRecipeId: string;
  activeProfileId: string;
  watermancerTargetSource: string;
  watermancerTargetOverride: Record<string, number> | null;
  watermancerUsedSaltIds: string[];
  autoCraftPreset: string;
  watermancerSaltObjective: string;
  /** Optional for compatibility with version-1 sessions created before ratio mode. */
  watermancerMatchingMode?: WatermancerMatchingMode;
  watermancerBestMatchDeviationMode: 'strict' | 'permissive' | null;
  watermancerIonSourcePreferences: Record<string, string>;
  watermancerDoseOverridesMg: Record<string, number>;
  sodiumCorrectionOn: boolean;
  /** Exact final readings captured when the plan was saved, if available. */
  finishedIons?: Record<string, number>;
  concentrateRecipeHandoff: {
    name: string;
    salts: Record<string, SaltRecipeEntry>;
    finalLiters: number;
  } | null;
  concentrate: WaterPlanConcentrateSnapshot;
};

export type WaterPlan = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  snapshot: WaterPlanSnapshot;
};

export const WATER_PLAN_FILE_KIND = 'coffee-water-plan';
export const WATER_PLAN_VERSION = 1;
export const WATER_RECIPE_FILE_KIND = 'coffee-water-recipe';
export const WATER_RECIPE_FILE_VERSION = 1;
export const WATER_PLAN_AUTOSAVE_NAME = 'Last auto-saved session';

export type WaterRecipeShare = {
  kind: typeof WATER_RECIPE_FILE_KIND;
  version: typeof WATER_RECIPE_FILE_VERSION;
  name: string;
  ions: Record<string, number>;
  profile?: WaterRecipeProfileShare;
};

export type WaterRecipeProfileShare = {
  id?: string;
  name: string;
  source: string;
  details?: string;
  targets: Record<string, number>;
};

export function isAutoSavedWaterPlan(plan: Pick<WaterPlan, 'name'>): boolean {
  return plan.name === WATER_PLAN_AUTOSAVE_NAME;
}

const STORAGE_KEY = 'cwm.waterPlans';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every(item => typeof item === 'string');

const isNumberRecord = (value: unknown): value is Record<string, number> =>
  isRecord(value) && Object.values(value).every(item => typeof item === 'number' && Number.isFinite(item));

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

const isWaterEntry = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.volumeMl === 'string'
    && isStringRecord(value.ions)
    && isStringRecord(value.metadata)
    && (value.sourceLocalId === undefined || typeof value.sourceLocalId === 'string');
};

function isWaterPlanSnapshot(value: unknown): value is WaterPlanSnapshot {
  if (!isRecord(value)) return false;
  if (value.version !== WATER_PLAN_VERSION) return false;
  if (!['calculator', 'concentrate'].includes(String(value.appTab))) return false;
  if (!['brewer', 'alchemist', 'watermancer'].includes(String(value.nerdLevel))) return false;
  if (typeof value.liters !== 'string' || !['liters', 'gallons'].includes(String(value.volumeUnit))) return false;
  if (!Array.isArray(value.rows)
    || value.rows.some(row => !isRecord(row) || typeof row.target !== 'string' || !Number.isInteger(row.formIdx))
    || !Array.isArray(value.mineralWaters)
    || value.mineralWaters.some(entry => !isWaterEntry(entry))
    || !Array.isArray(value.additionWaters)
    || value.additionWaters.some(entry => !isWaterEntry(entry))) return false;
  if (typeof value.activeProfileId !== 'string' || typeof value.watermancerTargetSource !== 'string') return false;
  if (!['original', 'chlorides', 'sulfates'].includes(String(value.magnesiumPreference))) return false;
  if (!['mineral-first', 'bicarbonate-first', 'balanced-gh-kh', 'custom'].includes(String(value.autoFillPriorityPreset))) return false;
  if (!Number.isFinite(value.autoFillDeviationPpm)) return false;
  if (!Number.isFinite(value.brewerDropsPerMl)) return false;
  if (!isRecord(value.overshootSettings) || typeof value.overshootSettings.enabled !== 'boolean') return false;
  if (!isStringArray(value.overshootSettings.allowedIons) || !isNumberRecord(value.overshootSettings.limits)) return false;
  const brewerFlavor = isRecord(value.brewerFlavor) ? value.brewerFlavor : null;
  if (!brewerFlavor
    || !['brightness', 'body', 'juiciness', 'sweetness'].every(key => Number.isFinite(brewerFlavor[key]))) return false;
  if (!isStringArray(value.autoFillCustomPriority) || !isStringArray(value.watermancerUsedSaltIds)) return false;
  if (!['closest-match', 'water-first', 'gh-kh-harmony', 'added-water-mineral-first'].includes(String(value.autoCraftPreset))) return false;
  if (!['balanced', 'coverage'].includes(String(value.watermancerSaltObjective))) return false;
  if (value.watermancerMatchingMode !== undefined
    && !['target-values', 'ratios'].includes(String(value.watermancerMatchingMode))) return false;
  if (value.watermancerBestMatchDeviationMode !== null
    && !['strict', 'permissive'].includes(String(value.watermancerBestMatchDeviationMode))) return false;
  if (!isStringRecord(value.watermancerIonSourcePreferences) || !isNumberRecord(value.watermancerDoseOverridesMg)) return false;
  if (value.watermancerTargetOverride !== null && !isNumberRecord(value.watermancerTargetOverride)) return false;
  if (typeof value.sodiumCorrectionOn !== 'boolean') return false;
  const concentrate = isRecord(value.concentrate) ? value.concentrate : null;
  if (!concentrate
    || !['builder', 'lotus'].includes(String(concentrate.mode))
    || typeof concentrate.saltId !== 'string'
    || !Number.isInteger(concentrate.formIdx)
    || !['round', 'straight'].includes(String(concentrate.dropperStyle))
    || !['strengthInput', 'totalStockMassInput', 'calibrationDrops', 'calibrationStockMass', 'targetSaltMass', 'doseDrops', 'doseLiters', 'straightDropsPerMlInput']
      .every(key => typeof concentrate[key] === 'string')) return false;
  if (value.concentrateRecipeHandoff !== null) {
    if (!isRecord(value.concentrateRecipeHandoff)
      || typeof value.concentrateRecipeHandoff.name !== 'string'
      || !Number.isFinite(value.concentrateRecipeHandoff.finalLiters)
      || !isRecord(value.concentrateRecipeHandoff.salts)) return false;
  }
  return true;
}

export function isValidWaterPlan(value: unknown): value is WaterPlan {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && Boolean(value.name.trim())
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && isWaterPlanSnapshot(value.snapshot);
}

function readPlans(): WaterPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidWaterPlan) : [];
  } catch {
    return [];
  }
}

export function loadWaterPlans(): WaterPlan[] {
  return readPlans();
}

export function saveWaterPlans(plans: WaterPlan[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch {
    /* Ignore storage quota and privacy-mode failures. */
  }
}

export function newWaterPlanId(): string {
  return `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createWaterPlan(name: string, snapshot: WaterPlanSnapshot, now = new Date().toISOString()): WaterPlan {
  return {
    id: newWaterPlanId(),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    snapshot,
  };
}

export function serializeWaterPlanFile(plan: WaterPlan): string {
  return JSON.stringify({
    kind: WATER_PLAN_FILE_KIND,
    version: WATER_PLAN_VERSION,
    ...plan,
  }, null, 2);
}

export function serializeWaterRecipeFile(
  name: string,
  ions: Record<string, number>,
  profile?: WaterRecipeProfileShare,
): string {
  const recipe: WaterRecipeShare = {
    kind: WATER_RECIPE_FILE_KIND,
    version: WATER_RECIPE_FILE_VERSION,
    name: name.trim() || 'Custom recipe',
    ions: Object.fromEntries(
      Object.entries(ions)
        .filter(([, value]) => Number.isFinite(value))
        .map(([id, value]) => [id, Math.max(0, value)]),
    ),
    ...(profile
      ? {
        profile: {
          ...(profile.id ? { id: profile.id } : {}),
          name: profile.name.trim() || 'Custom target profile',
          source: profile.source.trim() || 'Watermancer',
          ...(profile.details?.trim() ? { details: profile.details.trim() } : {}),
          targets: Object.fromEntries(
            Object.entries(profile.targets)
              .filter(([, value]) => Number.isFinite(value))
              .map(([id, value]) => [id, Math.max(0, value)]),
          ),
        },
      }
      : {}),
  };
  return JSON.stringify(recipe, null, 2);
}

export function parseWaterRecipeFile(text: string): WaterRecipeShare | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!isRecord(parsed)
      || parsed.kind !== WATER_RECIPE_FILE_KIND
      || parsed.version !== WATER_RECIPE_FILE_VERSION
      || typeof parsed.name !== 'string'
      || !parsed.name.trim()
      || !isNumberRecord(parsed.ions)) return null;
    return {
      kind: WATER_RECIPE_FILE_KIND,
      version: WATER_RECIPE_FILE_VERSION,
      name: parsed.name.trim(),
      ions: Object.fromEntries(
        Object.entries(parsed.ions).map(([id, value]) => [id, Math.max(0, value)]),
      ),
      ...(isRecord(parsed.profile)
        && typeof parsed.profile.name === 'string'
        && typeof parsed.profile.source === 'string'
        && isNumberRecord(parsed.profile.targets)
        ? {
          profile: {
            ...(typeof parsed.profile.id === 'string' ? { id: parsed.profile.id } : {}),
            name: parsed.profile.name.trim() || 'Custom target profile',
            source: parsed.profile.source.trim() || 'Watermancer',
            ...(typeof parsed.profile.details === 'string' && parsed.profile.details.trim()
              ? { details: parsed.profile.details.trim() }
              : {}),
            targets: Object.fromEntries(
              Object.entries(parsed.profile.targets).map(([id, value]) => [id, Math.max(0, value)]),
            ),
          },
        }
        : {}),
    };
  } catch {
    return null;
  }
}

export function parseWaterPlanFile(text: string): WaterPlan | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!isRecord(parsed) || parsed.kind !== WATER_PLAN_FILE_KIND || parsed.version !== WATER_PLAN_VERSION) return null;
    const candidate = {
      id: newWaterPlanId(),
      name: parsed.name,
      createdAt: parsed.createdAt,
      updatedAt: new Date().toISOString(),
      snapshot: parsed.snapshot,
    };
    return isValidWaterPlan(candidate) ? candidate : null;
  } catch {
    return null;
  }
}