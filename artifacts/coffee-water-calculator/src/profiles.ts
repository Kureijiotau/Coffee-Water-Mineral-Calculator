import {
  AIKI_DEFAULT_PROFILE, ACTIVE_ION_IDS, ION_MAP, IONS,
  type IonId, type RangeSet, type WaterProfile,
} from '@/waterData';
import { EMPIRICAL_WATERS } from './empiricalWaters';

const PROFILES_KEY = 'cwm.profiles';
const ACTIVE_KEY = 'cwm.activeProfileId';
const INDICATOR_KEY = 'cwm.indicatorOn';
const NERD_LEVEL_KEY = 'cwm.nerdLevel';

export type NerdLevel = 'brewer' | 'alchemist' | 'watermancer';

export const EMPIRICAL_PROFILES: WaterProfile[] = EMPIRICAL_WATERS.map(water => ({
  id: `${water.id}-ionic-profile`,
  name: `${water.name} ionic profile`,
  locked: true,
  description: `Published Empirical Water profile. Good ceilings use the published ion values; Elevated ceilings use 20% of those values. Source: ${water.sourceUrl}`,
  ranges: Object.fromEntries(
    ACTIVE_ION_IDS.map(id => {
      const publishedValue = water.ions[id] ?? 0;
      return [id, {
        greenMax: publishedValue,
        yellowMax: publishedValue * 0.2,
      }];
    }),
  ) as RangeSet,
}));

const BUILT_IN_PROFILE_IDS = new Set([
  AIKI_DEFAULT_PROFILE.id,
  ...EMPIRICAL_PROFILES.map(profile => profile.id),
]);

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
  const parsed = readJSON<unknown>(PROFILES_KEY, []);
  const stored = Array.isArray(parsed)
    ? parsed.filter((profile): profile is WaterProfile => (
      Boolean(profile)
      && typeof profile === 'object'
      && !Array.isArray(profile)
      && typeof (profile as Partial<WaterProfile>).id === 'string'
      && typeof (profile as Partial<WaterProfile>).name === 'string'
      && Boolean((profile as Partial<WaterProfile>).ranges)
      && typeof (profile as Partial<WaterProfile>).ranges === 'object'
      && !Array.isArray((profile as Partial<WaterProfile>).ranges)
    ))
    : [];
  // Always ensure built-in profiles are present and up to date
  const withoutBuiltIns = stored.filter(p => !BUILT_IN_PROFILE_IDS.has(p.id));
  // Migrate stored profiles that are missing any ions (e.g. newly added citrates)
  const migrated = withoutBuiltIns.map(p => {
    const missing = IONS.filter(i => !(i.id in p.ranges));
    if (missing.length === 0) return p;
    const ranges = { ...p.ranges };
    for (const i of missing) {
      ranges[i.id] = { greenMax: i.greenMax, yellowMax: i.yellowMax };
    }
    return { ...p, ranges };
  });
  return [AIKI_DEFAULT_PROFILE, ...EMPIRICAL_PROFILES, ...migrated];
}

export function saveProfiles(profiles: WaterProfile[]): void {
  // Never persist built-in locked profiles — they are always re-injected from code
  writeJSON(PROFILES_KEY, profiles.filter(p => !BUILT_IN_PROFILE_IDS.has(p.id)));
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

export function loadNerdLevel(): NerdLevel {
  const raw = localStorage.getItem(NERD_LEVEL_KEY);
  return raw === 'alchemist' || raw === 'watermancer' ? raw : 'brewer';
}

export function saveNerdLevel(level: NerdLevel): void {
  try {
    localStorage.setItem(NERD_LEVEL_KEY, level);
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
    const info = ION_MAP[id as IonId];
    if (info) rs[id] = { greenMax: info.greenMax, yellowMax: info.yellowMax };
  }
  return rs;
}
