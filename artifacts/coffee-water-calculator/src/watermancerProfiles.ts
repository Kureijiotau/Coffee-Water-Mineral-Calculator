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
    return profiles;
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