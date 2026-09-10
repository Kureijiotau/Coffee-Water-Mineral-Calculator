import type { WaterPlanSnapshot, WaterPlanVolumeUnit } from './waterPlans';

export const WATER_RECIPE_SHARE_KIND = 'coffee-water-recipe-share';
export const WATER_RECIPE_SHARE_VERSION = 1;
export const WATER_RECIPE_SHARE_PARAM = 'waterRecipe';

export type WaterRecipeShareWater = {
  id: string;
  name: string;
  ions: Record<string, string>;
  metadata: Record<string, string>;
  volumeMl: string;
  sourceLocalId?: string;
};

export type WaterRecipeSharePayload = {
  kind: typeof WATER_RECIPE_SHARE_KIND;
  version: typeof WATER_RECIPE_SHARE_VERSION;
  name: string;
  liters: string;
  volumeUnit: WaterPlanVolumeUnit;
  rows: Array<{ target: string; formIdx: number }>;
  mineralWaters: WaterRecipeShareWater[];
  additionWaters: WaterRecipeShareWater[];
  finishedIons?: Record<string, number>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every(item => typeof item === 'string');

const isNumberRecord = (value: unknown): value is Record<string, number> =>
  isRecord(value)
  && Object.values(value).every(item => typeof item === 'number' && Number.isFinite(item) && item >= 0);

const isShareWater = (value: unknown): value is WaterRecipeShareWater => {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && isStringRecord(value.ions)
    && isStringRecord(value.metadata)
    && typeof value.volumeMl === 'string'
    && (value.sourceLocalId === undefined || typeof value.sourceLocalId === 'string');
};

export function createWaterRecipeSharePayload(
  snapshot: Pick<WaterPlanSnapshot, 'liters' | 'volumeUnit' | 'rows' | 'mineralWaters' | 'additionWaters' | 'finishedIons'>,
  name: string,
): WaterRecipeSharePayload {
  return {
    kind: WATER_RECIPE_SHARE_KIND,
    version: WATER_RECIPE_SHARE_VERSION,
    name: name.trim() || 'Shared coffee water recipe',
    liters: snapshot.liters,
    volumeUnit: snapshot.volumeUnit,
    rows: snapshot.rows.map(row => ({ target: row.target, formIdx: row.formIdx })),
    mineralWaters: snapshot.mineralWaters.map(water => ({ ...water })),
    additionWaters: snapshot.additionWaters.map(water => ({ ...water })),
    ...(snapshot.finishedIons ? { finishedIons: { ...snapshot.finishedIons } } : {}),
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function encodeWaterRecipeSharePayload(payload: WaterRecipeSharePayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function decodeWaterRecipeSharePayload(encoded: string): WaterRecipeSharePayload | null {
  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const parsed: unknown = JSON.parse(new TextDecoder().decode(base64ToBytes(padded)));
    if (!isRecord(parsed)
      || parsed.kind !== WATER_RECIPE_SHARE_KIND
      || parsed.version !== WATER_RECIPE_SHARE_VERSION
      || typeof parsed.name !== 'string'
      || !parsed.name.trim()
      || typeof parsed.liters !== 'string'
      || !['liters', 'gallons'].includes(String(parsed.volumeUnit))
      || !Array.isArray(parsed.rows)
      || parsed.rows.some(row => !isRecord(row)
        || typeof row.target !== 'string'
        || !Number.isInteger(row.formIdx)
        || Number(row.formIdx) < 0)
      || !Array.isArray(parsed.mineralWaters)
      || parsed.mineralWaters.some(water => !isShareWater(water))
      || !Array.isArray(parsed.additionWaters)
      || parsed.additionWaters.some(water => !isShareWater(water))
      || (parsed.finishedIons !== undefined && !isNumberRecord(parsed.finishedIons))) {
      return null;
    }
    return {
      kind: WATER_RECIPE_SHARE_KIND,
      version: WATER_RECIPE_SHARE_VERSION,
      name: parsed.name.trim(),
      liters: parsed.liters,
      volumeUnit: parsed.volumeUnit as WaterPlanVolumeUnit,
      rows: parsed.rows.map(row => ({
        target: String((row as Record<string, unknown>).target),
        formIdx: Number((row as Record<string, unknown>).formIdx),
      })),
      mineralWaters: parsed.mineralWaters.map(water => ({ ...(water as WaterRecipeShareWater) })),
      additionWaters: parsed.additionWaters.map(water => ({ ...(water as WaterRecipeShareWater) })),
      ...(parsed.finishedIons ? { finishedIons: { ...parsed.finishedIons } } : {}),
    };
  } catch {
    return null;
  }
}

export function createWaterRecipeShareUrl(
  payload: WaterRecipeSharePayload,
  origin = window.location.origin,
): string {
  const url = new URL('/', origin);
  url.searchParams.set(WATER_RECIPE_SHARE_PARAM, encodeWaterRecipeSharePayload(payload));
  return url.toString();
}