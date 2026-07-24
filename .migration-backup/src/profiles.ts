import {
  AIKI_DEFAULT_PROFILE, ACTIVE_ION_IDS, ION_MAP,
  type IonId, type RangeSet, type WaterProfile,
} from '@/waterData';

const PROFILES_KEY = 'cwm.profiles';
const ACTIVE_KEY = 'cwm.activeProfileId';
const INDICATOR_KEY = 'cwm.indicatorOn';

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
    /* ignore quota / privacy mode errors */
  }
}

export function loadProfiles(): WaterProfile[] {
  const stored = readJSON<WaterProfile[]>(PROFILES_KEY, []);
  // Always ensure Aiki's default is present and up to date
  const withoutAiki = stored.filter(p => p.id !== AIKI_DEFAULT_PROFILE.id);
  return [AIKI_DEFAULT_PROFILE, ...withoutAiki];
}

export function saveProfiles(profiles: WaterProfile[]): void {
  // Never persist Aiki's locked default — it's always re-injected from code
  writeJSON(PROFILES_KEY, profiles.filter(p => p.id !== AIKI_DEFAULT_PROFILE.id));
}

export function loadActiveProfileId(): string {
  return localStorage.getItem(ACTIVE_KEY) || AIKI_DEFAULT_PROFILE.id;
}

export function saveActiveProfileId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function loadIndicatorOn(): boolean {
  const raw = localStorage.getItem(INDICATOR_KEY);
  if (raw === null) return true;
  return raw === 'true';
}

export function saveIndicatorOn(on: boolean): void {
  try {
    localStorage.setItem(INDICATOR_KEY, String(on));
  } catch {
    /* ignore */
  }
}

export function createProfile(name: string, ranges: RangeSet): WaterProfile {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    ranges,
    locked: false,
  };
}

export function emptyRangeSet(): RangeSet {
  const rs = {} as RangeSet;
  for (const id of ACTIVE_ION_IDS) {
    rs[id] = { greenMax: ION_MAP[id as IonId].greenMax, yellowMax: ION_MAP[id as IonId].yellowMax };
  }
  return rs;
}
