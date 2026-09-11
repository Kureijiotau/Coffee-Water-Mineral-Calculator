import { ACTIVE_ION_IDS, SALTS, computeIonTotals, type IonId } from '@/waterData';
import type { WaterMetadata } from '@/localWaters';
import {
  extractWaterRecipeJsonFromPng,
  extractWaterRecipeJsonFromQrImage,
  resolveRecipeImageMimeType,
  isPngImageBytes,
} from './waterRecipeImage';
import {
  parseWaterPlanFile,
  type WaterPlan,
} from './waterPlans';
import {
  normalizeWaterMixSourceSnapshot,
  WATER_MIX_FILE_KIND,
  WATER_MIX_FILE_VERSION,
  type WaterMixSourceSnapshot,
} from './waterMixer';
import {
  LEGACY_WATER_PAYLOAD_VERSION,
  migrateLegacyWaterPayload,
} from './legacyWaterRecovery';
import {
  decodeWaterRecipeSharePayload,
  type WaterRecipeSharePayload,
  type WaterRecipeShareWater,
} from './waterRecipeShare';

type RecordValue = Record<string, unknown>;

export type ParsedWaterMixerImport =
  | {
      kind: 'source';
      source: WaterMixSourceSnapshot;
      provenance?: string;
      legacySaltTargets?: Record<string, number>;
    }
  | {
      kind: 'recipe';
      recipe: WaterMixerImportedRecipe;
      provenance?: string;
    }
  | { kind: 'plan'; plan: WaterPlan }
  | { kind: 'error'; message: string };

export type WaterMixerImportedRecipe = {
  name: string;
  sourceA: WaterMixSourceSnapshot;
  sourceB: WaterMixSourceSnapshot;
  volumeAMl: number;
  volumeBMl: number;
  finalIons: Record<IonId, number>;
  saltTargets: Record<string, number>;
  formIdxBySaltId: Record<string, number>;
};

export type WaterMixerImportResult =
  | {
      source: WaterMixSourceSnapshot;
      provenance?: string;
      legacySaltTargets?: Record<string, number>;
    }
  | {
      recipe: WaterMixerImportedRecipe;
      provenance?: string;
    }
  | { error: string };

const isRecord = (value: unknown): value is RecordValue =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

function parseIonRecord(value: unknown): Partial<Record<IonId, number>> | null {
  if (!isRecord(value)) return null;
  const parsed: Partial<Record<IonId, number>> = {};
  let knownCount = 0;
  for (const [id, raw] of Object.entries(value)) {
    if (!ACTIVE_ION_IDS.includes(id as IonId)) continue;
    if (!isFiniteNonNegative(raw)) return null;
    parsed[id as IonId] = raw;
    knownCount += 1;
  }
  return knownCount > 0 ? parsed : null;
}

function parseMetadata(value: unknown): WaterMetadata | undefined {
  if (!isRecord(value)) return undefined;
  const metadata: WaterMetadata = {};
  for (const key of ['silica', 'ph', 'tds', 'alkalinity'] as const) {
    if (isFiniteNonNegative(value[key])) metadata[key] = value[key];
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function parseShareWaterMetadata(water: WaterRecipeShareWater): WaterMetadata | undefined {
  return parseMetadata(Object.fromEntries(
    Object.entries(water.metadata).map(([key, value]) => [key, Number(value)]),
  ));
}

function importedSourceFromShareWater(
  water: WaterRecipeShareWater,
  sourceId: string,
): WaterMixSourceSnapshot {
  const ions = Object.fromEntries(
    ACTIVE_ION_IDS.map(id => [id, Number(water.ions[id] ?? 0)]),
  ) as Record<IonId, number>;
  return normalizeWaterMixSourceSnapshot({
    name: water.name,
    sourceKind: 'saved-recipe',
    sourceId: water.sourceLocalId?.trim() || sourceId,
    ions,
    metadata: parseShareWaterMetadata(water),
  });
}

function importedMixerRecipeFromSharePayload(
  payload: WaterRecipeSharePayload,
): WaterMixerImportedRecipe | null {
  const sourceAEntry = payload.mineralWaters[0];
  const sourceBEntry = payload.additionWaters[0];
  if (!sourceAEntry || !sourceBEntry) return null;

  const sourceA = importedSourceFromShareWater(sourceAEntry, 'shared-source-a');
  const sourceB = importedSourceFromShareWater(sourceBEntry, 'shared-source-b');
  const volumeAMl = Number(sourceAEntry.volumeMl);
  const volumeBMl = Number(sourceBEntry.volumeMl);
  if (!Number.isFinite(volumeAMl) || volumeAMl < 0 || !Number.isFinite(volumeBMl) || volumeBMl < 0) {
    return null;
  }

  const formIdxBySaltId: Record<string, number> = {};
  const saltTargets: Record<string, number> = {};
  payload.rows.forEach((row, index) => {
    const salt = SALTS[index];
    if (!salt) return;
    const formIdx = Math.min(
      Math.max(row.formIdx, 0),
      Math.max(salt.hydrationForms.length - 1, 0),
    );
    formIdxBySaltId[salt.id] = formIdx;
    const target = Number(row.target);
    if (Number.isFinite(target) && target > 0) saltTargets[salt.id] = target;
  });

  const weightedFinishedIons = Object.fromEntries(
    ACTIVE_ION_IDS.map(id => {
      const totalVolume = volumeAMl + volumeBMl;
      const weighted = totalVolume > 0
        ? (sourceA.ions[id] * volumeAMl + sourceB.ions[id] * volumeBMl) / totalVolume
        : 0;
      return [id, weighted];
    }),
  ) as Partial<Record<IonId, number>>;
  const finalIonInputs = payload.finishedIons ?? weightedFinishedIons;
  const finalIons = normalizeWaterMixSourceSnapshot({
    name: payload.name,
    sourceKind: 'saved-recipe',
    ions: Object.fromEntries(
      ACTIVE_ION_IDS.map(id => [id, Number(finalIonInputs[id] ?? 0)]),
    ) as Record<IonId, number>,
  }).ions;

  return {
    name: payload.name,
    sourceA,
    sourceB,
    volumeAMl,
    volumeBMl,
    finalIons,
    saltTargets,
    formIdxBySaltId,
  };
}

function importedSourceFromPayload(payload: RecordValue): WaterMixSourceSnapshot | null {
  if (typeof payload.name !== 'string' || !payload.name.trim()) return null;
  const ions = parseIonRecord(payload.finishedWaterIons) ?? parseIonRecord(payload.ions);
  if (!ions) return null;
  const migration = migrateLegacyWaterPayload({
    kind: 'coffee-water-recipe',
    version: Number(payload.version),
    name: payload.name,
    ions,
  });
  return normalizeWaterMixSourceSnapshot({
    name: payload.name,
    sourceKind: 'saved-recipe',
    sourceId: `import-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ions: migration?.ions ?? ions as Record<IonId, number>,
    metadata: parseMetadata(payload.finishedWaterMetadata),
    provenance: migration?.provenance ?? (isRecord(payload.profile)
      ? 'Imported Watermancer profile snapshot'
      : undefined),
  });
}

function importedLegacySaltRecipeFromPayload(
  payload: RecordValue,
): { source: WaterMixSourceSnapshot; saltTargets: Record<string, number>; provenance: string } | null {
  if (typeof payload.name !== 'string' || !payload.name.trim() || !isRecord(payload.salts)) return null;
  if (isRecord(payload.profile)) return null;

  const knownSaltIds = new Set(SALTS.map(salt => salt.id));
  const saltTargets: Record<string, number> = {};
  for (const [saltId, rawEntry] of Object.entries(payload.salts)) {
    if (!knownSaltIds.has(saltId) || !isRecord(rawEntry)) continue;
    const rawTarget = rawEntry.target;
    const target = typeof rawTarget === 'number' ? rawTarget : Number.parseFloat(String(rawTarget ?? ''));
    if (!Number.isFinite(target) || target < 0) return null;
    saltTargets[saltId] = target;
  }
  if (Object.keys(saltTargets).length === 0) return null;

  const migration = migrateLegacyWaterPayload({
    kind: 'coffee-water-recipe',
    version: Number(payload.version),
    name: payload.name,
    saltTargets,
  });
  const ions = migration?.ions ?? computeIonTotals(saltTargets, {}, 1);
  return {
    source: normalizeWaterMixSourceSnapshot({
      name: payload.name,
      sourceKind: 'saved-recipe',
      sourceId: `legacy-import-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      ions,
    }),
    saltTargets,
    provenance: migration
      ? migration.provenance
      : 'Legacy recipe · zero-mineral RO estimate',
  };
}

function importedMixerRecipeFromPayload(
  payload: RecordValue,
): { source: WaterMixSourceSnapshot; provenance?: string } | null {
  if (payload.kind !== WATER_MIX_FILE_KIND || payload.version !== WATER_MIX_FILE_VERSION) return null;
  if (typeof payload.name !== 'string' || !payload.name.trim()) return null;
  const ions = parseIonRecord(payload.finalIons);
  if (!ions) return null;
  const migration = migrateLegacyWaterPayload({
    kind: WATER_MIX_FILE_KIND,
    version: WATER_MIX_FILE_VERSION,
    name: payload.name,
    ions,
  });
  return {
    source: normalizeWaterMixSourceSnapshot({
      name: payload.name,
      sourceKind: 'saved-recipe',
      sourceId: `mixer-import-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      ions: migration?.ions ?? ions as Record<IonId, number>,
      metadata: parseMetadata(payload.finalMetadata),
      provenance: migration?.provenance,
    }),
    ...(migration ? { provenance: migration.provenance } : {}),
  };
}

export function parseWaterMixerImportText(text: string): ParsedWaterMixerImport {
  const sharedPayload = decodeWaterRecipeSharePayload(text);
  if (sharedPayload) {
    const recipe = importedMixerRecipeFromSharePayload(sharedPayload);
    if (recipe) {
      return {
        kind: 'recipe',
        recipe,
        provenance: 'Shared Mixer recipe',
      };
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return { kind: 'error', message: 'That file is not readable recipe JSON.' };
  }
  const plan = parseWaterPlanFile(text);
  if (plan) return { kind: 'plan', plan };
  if (!isRecord(payload)) {
    return { kind: 'error', message: 'That file does not contain a supported finished-water recipe.' };
  }
  const mixerSource = importedMixerRecipeFromPayload(payload);
  if (mixerSource) {
    return {
      kind: 'source',
      source: mixerSource.source,
      provenance: mixerSource.provenance ?? 'Mixer blend snapshot',
    };
  }
  if (payload.kind !== 'coffee-water-recipe' || payload.version !== 1) {
    return { kind: 'error', message: 'That file is not a supported coffee-water recipe or session.' };
  }
  const source = importedSourceFromPayload(payload);
  if (source) {
    return {
      kind: 'source',
      source,
      ...(source.provenance ? { provenance: source.provenance } : {}),
    };
  }
  if (isRecord(payload.salts)) {
    const legacyImport = importedLegacySaltRecipeFromPayload(payload);
    if (legacyImport) {
      return {
        kind: 'source',
        source: legacyImport.source,
        provenance: legacyImport.provenance,
        legacySaltTargets: legacyImport.saltTargets,
      };
    }
    return {
      kind: 'error',
      message: 'This legacy salt recipe does not contain usable salt targets or final readings.',
    };
  }
  return {
    kind: 'error',
    message: 'This recipe does not contain saved final-water ion readings.',
  };
}

export async function readWaterMixerImportFile(file: File): Promise<ParsedWaterMixerImport> {
  const bytes = await file.arrayBuffer();
  const isPng = isPngImageBytes(bytes);
  const imageMimeType = resolveRecipeImageMimeType(file.name, file.type, bytes);
  try {
    const importedText = (imageMimeType
      ? await extractWaterRecipeJsonFromQrImage(bytes, imageMimeType)
      : null)
      ?? (isPng ? extractWaterRecipeJsonFromPng(bytes) : null)
      ?? (imageMimeType ? null : new TextDecoder().decode(bytes));
    if (!importedText) {
      return {
        kind: 'error',
        message: isPng
          ? 'That PNG does not contain embedded recipe readings for the Mixer.'
          : imageMimeType
            ? 'That image does not contain a readable recipe QR code.'
            : 'That file does not contain a readable recipe.',
      };
    }
    return parseWaterMixerImportText(importedText);
  } catch {
    return {
      kind: 'error',
      message: isPng
        ? 'That PNG is not a readable recipe card.'
        : imageMimeType
          ? 'That image is not a readable recipe card.'
          : 'That file is not a readable recipe.',
    };
  }
}