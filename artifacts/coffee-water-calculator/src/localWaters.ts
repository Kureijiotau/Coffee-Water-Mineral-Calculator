export interface LocalWater {
  id: string;
  name: string;
  ions: Record<string, number>;
  metadata?: WaterMetadata;
  /** API id if imported from the community database */
  sourceId?: number;
}

export interface WaterMetadata {
  silica?: number;
  ph?: number;
  tds?: number;
  alkalinity?: number;
}

const LOCAL_WATERS_KEY = 'cwm.localWaters';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function isValidLocalWater(value: unknown): value is LocalWater {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const water = value as Partial<LocalWater>;
  if (typeof water.id !== 'string' || typeof water.name !== 'string') return false;
  if (!water.ions || typeof water.ions !== 'object' || Array.isArray(water.ions)) return false;
  return Object.values(water.ions).every(ion => typeof ion === 'number' && Number.isFinite(ion));
}

export function loadLocalWaters(): LocalWater[] {
  const parsed = readJSON<unknown>(LOCAL_WATERS_KEY, []);
  return Array.isArray(parsed) ? parsed.filter(isValidLocalWater) : [];
}

export function saveLocalWaters(waters: LocalWater[]): void {
  writeJSON(LOCAL_WATERS_KEY, waters);
}

export function newLocalWaterId(): string {
  return `lw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
