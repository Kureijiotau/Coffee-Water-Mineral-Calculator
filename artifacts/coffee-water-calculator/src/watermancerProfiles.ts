import type { IonId } from '@/waterData';
import { ACTIVE_ION_IDS } from '@/waterData';

export type IonicTargetValues = Partial<Record<IonId, number>>;

export interface WatermancerProfile {
  id: string;
  name: string;
  targets: IonicTargetValues;
  /** Final readings from the recipe that produced this saved target profile. */
  finishedIons?: IonicTargetValues;
  source?: string;
  sourceUrl?: string;
  details?: string;
}

const STORAGE_KEY = 'cwm.watermancerProfiles';
const GIZE_STILL_SEED_KEY = 'cwm.watermancerProfileSeeds.gizeStill';
const KAROO_SEED_KEY = 'cwm.watermancerProfileSeeds.karoo';
const GIZE_STILL_SOURCE_URL = 'https://fine-liquids.com/en-us/collections/newcomer/products/gize-still-mhd?variant=49404645933393';

export const GIZE_STILL_PROFILE: WatermancerProfile = {
  id: 'watermancer-gize-still',
  name: 'Gize Still',
  targets: {
    sodium: 36.1,
    potassium: 1.9,
    magnesium: 9.5,
    calcium: 286,
    chloride: 9.9,
    sulfate: 692,
    bicarbonate: 115,
    citrates: 0,
  },
  source: 'Fine Liquids',
  sourceUrl: GIZE_STILL_SOURCE_URL,
  details: 'Published profile: TDS 1,170 mg/L, pH 8.1, silica 15 mg/L.',
};

export const KAROO_PROFILE: WatermancerProfile = {
  id: 'watermancer-karoo',
  name: 'Karoo',
  targets: {
    sodium: 27.6,
    potassium: 1.7,
    magnesium: 2.4,
    calcium: 14.7,
    chloride: 44.1,
    sulfate: 6,
    bicarbonate: 31,
    citrates: 0,
  },
  source: 'User-provided label profile',
  details: 'Label profile: TDS 190 mg/L, pH 7.2, hardness 19.25 mg/L, nitrates 0.96 mg/L; silica not listed.',
};

const SEEDED_PROFILES = [
  { key: GIZE_STILL_SEED_KEY, profile: GIZE_STILL_PROFILE },
  { key: KAROO_SEED_KEY, profile: KAROO_PROFILE },
];

function readProfiles(): WatermancerProfile[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(stored)) return [];
    const profiles = stored.flatMap(item => {
      if (!item || typeof item !== 'object') return [];
      const profile = item as Partial<WatermancerProfile>;
      if (typeof profile.id !== 'string' || typeof profile.name !== 'string' || !profile.targets) return [];
      const targets = Object.fromEntries(
        ACTIVE_ION_IDS.flatMap(id => {
          const value = Number(profile.targets?.[id]);
          return Number.isFinite(value) && value >= 0 ? [[id, value]] : [];
        }),
      ) as IonicTargetValues;
      const finishedIons = Object.fromEntries(
        ACTIVE_ION_IDS.flatMap(id => {
          const value = Number(profile.finishedIons?.[id]);
          return Number.isFinite(value) && value >= 0 ? [[id, value]] : [];
        }),
      ) as IonicTargetValues;
      return [{
        id: profile.id,
        name: profile.name,
        targets,
        ...(Object.keys(finishedIons).length > 0 ? { finishedIons } : {}),
        ...(typeof profile.source === 'string' && profile.source.trim() ? { source: profile.source.trim() } : {}),
        ...(typeof profile.sourceUrl === 'string' && profile.sourceUrl.trim() ? { sourceUrl: profile.sourceUrl.trim() } : {}),
        ...(typeof profile.details === 'string' && profile.details.trim() ? { details: profile.details.trim() } : {}),
      }];
    });
    let seededProfiles = profiles;
    const pendingSeeds = SEEDED_PROFILES.filter(({ key }) => localStorage.getItem(key) !== '1');
    for (const { profile } of pendingSeeds) {
      if (!seededProfiles.some(existing => existing.id === profile.id)) {
        seededProfiles = [...seededProfiles, profile];
      }
    }
    if (pendingSeeds.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seededProfiles));
        for (const { key } of pendingSeeds) localStorage.setItem(key, '1');
      } catch {
        /* Ignore storage quota and privacy-mode failures. */
      }
    }
    return seededProfiles;
  } catch {
    return [];
  }
}

export function loadWatermancerProfiles(): WatermancerProfile[] {
  return readProfiles();
}

export function saveWatermancerProfiles(profiles: WatermancerProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    /* Ignore storage quota and privacy-mode failures. */
  }
}

export function createWatermancerProfile(
  name: string,
  targets: IonicTargetValues,
  metadata?: Pick<WatermancerProfile, 'source' | 'sourceUrl' | 'details' | 'finishedIons'>,
): WatermancerProfile {
  return {
    id: `watermancer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    targets: Object.fromEntries(
      ACTIVE_ION_IDS.map(id => [id, Math.max(Number(targets[id] ?? 0), 0)]),
    ) as IonicTargetValues,
    ...(metadata?.finishedIons
      ? {
        finishedIons: Object.fromEntries(
          ACTIVE_ION_IDS.map(id => [id, Math.max(Number(metadata.finishedIons?.[id] ?? 0), 0)]),
        ) as IonicTargetValues,
      }
      : {}),
    ...(metadata?.source?.trim() ? { source: metadata.source.trim() } : {}),
    ...(metadata?.sourceUrl?.trim() ? { sourceUrl: metadata.sourceUrl.trim() } : {}),
    ...(metadata?.details?.trim() ? { details: metadata.details.trim() } : {}),
  };
}