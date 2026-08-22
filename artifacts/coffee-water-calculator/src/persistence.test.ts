import { beforeEach, describe, expect, it } from 'vitest';
import { loadLocalWaters } from './localWaters';
import { loadProfiles } from './profiles';

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

describe('persistence shape guards', () => {
  beforeEach(() => localStorageMock.clear());

  it('falls back when saved local waters contain the wrong top-level shape', () => {
    localStorageMock.setItem('cwm.localWaters', JSON.stringify({ id: 'not-an-array' }));

    expect(loadLocalWaters()).toEqual([]);
  });

  it('filters malformed local waters without dropping valid entries', () => {
    localStorageMock.setItem('cwm.localWaters', JSON.stringify([
      null,
      { id: 'missing-ions', name: 'Broken' },
      { id: 'good', name: 'Good', ions: { calcium: 12, magnesium: 0 } },
    ]));

    expect(loadLocalWaters()).toEqual([
      { id: 'good', name: 'Good', ions: { calcium: 12, magnesium: 0 } },
    ]);
  });

  it('falls back when saved profiles contain the wrong top-level shape', () => {
    localStorageMock.setItem('cwm.profiles', JSON.stringify({ id: 'not-an-array' }));

    expect(() => loadProfiles()).not.toThrow();
    expect(loadProfiles().length).toBeGreaterThan(0);
  });

  it('filters malformed profiles without crashing built-in profile loading', () => {
    localStorageMock.setItem('cwm.profiles', JSON.stringify([
      null,
      { id: 'missing-ranges', name: 'Broken' },
    ]));

    expect(() => loadProfiles()).not.toThrow();
    expect(loadProfiles().every(profile => profile.id !== 'missing-ranges')).toBe(true);
  });
});