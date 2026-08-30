import type { IonId } from '@/waterData';
import { ACTIVE_ION_IDS } from '@/waterData';

export type IonicTargetValues = Partial<Record<IonId, number>>;

export interface WatermancerProfile {
  id: string;
  name: string;
  targets: IonicTargetValues;
  source?: string;
  sourceUrl?: string;
  details?: string;
}

const STORAGE_KEY = 'cwm.watermancerProfiles';
const GIZE_STILL_SEED_KEY = 'cwm.watermancerProfileSeeds.gizeStill';
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
      return [{
        id: profile.id,
        name: profile.name,
        targets,
        ...(typeof profile.source === 'string' && profile.source.trim() ? { source: profile.source.trim() } : {}),
        ...(typeof profile.sourceUrl === 'string' && profile.sourceUrl.trim() ? { sourceUrl: profile.sourceUrl.trim() } : {}),
        ...(typeof profile.details === 'string' && profile.details.trim() ? { details: profile.details.trim() } : {}),
      }];
    });
    if (localStorage.getItem(GIZE_STILL_SEED_KEY) === '1') return profiles;
    const seededProfiles = profiles.some(profile => profile.id === GIZE_STILL_PROFILE.id)
      ? profiles
      : [...profiles, GIZE_STILL_PROFILE];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seededProfiles));
      localStorage.setItem(GIZE_STILL_SEED_KEY, '1');
    } catch {
      /* Ignore storage quota and privacy-mode failures. */
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
  metadata?: Pick<WatermancerProfile, 'source' | 'sourceUrl' | 'details'>,
): WatermancerProfile {
  return {
    id: `watermancer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    targets: Object.fromEntries(
      ACTIVE_ION_IDS.map(id => [id, Math.max(Number(targets[id] ?? 0), 0)]),
    ) as IonicTargetValues,
    ...(metadata?.source?.trim() ? { source: metadata.source.trim() } : {}),
    ...(metadata?.sourceUrl?.trim() ? { sourceUrl: metadata.sourceUrl.trim() } : {}),
    ...(metadata?.details?.trim() ? { details: metadata.details.trim() } : {}),
  };
}