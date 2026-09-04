import { beforeEach, describe, expect, it } from 'vitest';
import { loadWatermancerProfiles } from './watermancerProfiles';

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