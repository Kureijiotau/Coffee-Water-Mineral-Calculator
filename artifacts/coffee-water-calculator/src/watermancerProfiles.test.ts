import { beforeEach, describe, expect, it } from 'vitest';
import {
  hasWatermancerFinalReadingDrift,
  loadWatermancerProfiles,
  overwriteWatermancerProfileWithFinalReadings,
  type WatermancerProfile,
} from './watermancerProfiles';

const storage: Record<string, string> = {};

const localStorageMock = {
  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
  },
  setItem(key: string, value: string): void {
    storage[key] = value;
  },
  removeItem(key: string): void {
    delete storage[key];
  },
  clear(): void {
    Object.keys(storage).forEach(key => delete storage[key]);
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Watermancer profile persistence', () => {
  beforeEach(() => localStorageMock.clear());

  it('does not add bundled profiles for new users', () => {
    expect(loadWatermancerProfiles()).toEqual([]);
    expect(storage['cwm.watermancerProfiles']).toBeUndefined();
  });

  it('keeps existing stored profiles available', () => {
    const storedProfile = {
      id: 'saved-profile',
      name: 'Saved profile',
      targets: { calcium: 40, magnesium: 8 },
    };
    localStorageMock.setItem('cwm.watermancerProfiles', JSON.stringify([storedProfile]));

    expect(loadWatermancerProfiles()).toEqual([storedProfile]);
  });
});

describe('Watermancer final-reading overwrite', () => {
  it('detects differences at the precision shown in the live readings', () => {
    const profile = { targets: { calcium: 40, magnesium: 8 } };

    expect(hasWatermancerFinalReadingDrift(profile, { calcium: 40.00004, magnesium: 8 })).toBe(false);
    expect(hasWatermancerFinalReadingDrift(profile, { calcium: 40.0001, magnesium: 8 })).toBe(true);
    expect(hasWatermancerFinalReadingDrift(profile, { calcium: 40, magnesium: 8.0001 })).toBe(true);
    expect(hasWatermancerFinalReadingDrift(profile, { calcium: 40, magnesium: 8 })).toBe(false);
  });

  it('replaces targets and finished readings while preserving profile metadata', () => {
    const profile: WatermancerProfile = {
      id: 'saved-profile',
      name: 'Saved profile',
      targets: { calcium: 40, sodium: 5 },
      finishedIons: { calcium: 39 },
      source: 'Recipe source',
      sourceUrl: 'https://example.com/recipe',
      details: 'Saved notes',
    };

    const updated = overwriteWatermancerProfileWithFinalReadings(profile, {
      calcium: 42,
      magnesium: 9,
    });

    expect(updated).toMatchObject({
      id: 'saved-profile',
      name: 'Saved profile',
      source: 'Recipe source',
      sourceUrl: 'https://example.com/recipe',
      details: 'Saved notes',
      targets: { calcium: 42, magnesium: 9, sodium: 0 },
      finishedIons: { calcium: 42, magnesium: 9, sodium: 0 },
    });
  });
});