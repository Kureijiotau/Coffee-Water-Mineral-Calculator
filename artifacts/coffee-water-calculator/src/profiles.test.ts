import { describe, it, expect, beforeEach } from 'vitest';
import {
  AIKI_DEFAULT_PROFILE,
  WATERMANCER_SENSORY_PROFILE,
  IONS,
  classifyIon,
  type RangeSet,
  type WaterProfile,
  type IonRanges,
} from './waterData';

// ─── localStorage mock ────────────────────────────────────────────────────────
// vitest runs in 'node' environment — localStorage doesn't exist. Provide a
// minimal in-memory shim so profiles.ts can be imported and exercised.

const store: Record<string, string> = {};

const localStorageMock = {
  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
  },
  setItem(key: string, value: string): void {
    store[key] = value;
  },
  removeItem(key: string): void {
    delete store[key];
  },
  clear(): void {
    for (const k of Object.keys(store)) delete store[k];
  },
};

// Inject before the module is imported via dynamic import below.
// We assign it here so that profiles.ts — which runs at module-evaluation time —
// already sees a valid localStorage.
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Import after the shim is in place.
import {
  loadProfiles,
  saveProfiles,
  loadActiveProfileId,
  saveActiveProfileId,
  createProfile,
  emptyRangeSet,
  EMPIRICAL_PROFILES,
} from './profiles';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeCustomProfile(name: string, overrides: Partial<IonRanges> = {}): WaterProfile {
  const ranges = emptyRangeSet();
  for (const [k, v] of Object.entries(overrides)) {
    (ranges as Record<string, IonRanges>)[k] = v as IonRanges;
  }
  return createProfile(name, ranges);
}

// ─── loadProfiles / saveProfiles round-trips ─────────────────────────────────

describe('loadProfiles / saveProfiles round-trip', () => {
  beforeEach(() => localStorageMock.clear());

  it('always includes the Aiki default profile as the first entry', () => {
    const profiles = loadProfiles();
    expect(profiles[0].id).toBe(AIKI_DEFAULT_PROFILE.id);
    expect(profiles[0].locked).toBe(true);
  });

  it('returns Aiki, Watermancer Sensory, and built-in Empirical profiles when localStorage is empty', () => {
    const profiles = loadProfiles();
    expect(profiles[0].id).toBe(AIKI_DEFAULT_PROFILE.id);
    expect(profiles[1].id).toBe(WATERMANCER_SENSORY_PROFILE.id);
    expect(profiles.slice(2).map(p => p.id)).toEqual(EMPIRICAL_PROFILES.map(p => p.id));
    expect(profiles).toHaveLength(2 + EMPIRICAL_PROFILES.length);
  });

  it('uses published Empirical values for Good and 20% for Elevated', () => {
    const glacial = EMPIRICAL_PROFILES.find(p => p.id === 'empirical-glacial-ionic-profile')!;
    expect(glacial.locked).toBe(true);
    expect(glacial.ranges.calcium).toEqual({ greenMax: 9.25, yellowMax: 1.85 });
    expect(glacial.ranges.bicarbonate).toEqual({ greenMax: 29.201, yellowMax: 5.8402 });
  });

  it('round-trips a custom profile through save then load', () => {
    const custom = makeCustomProfile('My Profile');
    saveProfiles([AIKI_DEFAULT_PROFILE, custom]);

    const loaded = loadProfiles();
    // Aiki default is re-injected from code, not from storage
    expect(loaded).toHaveLength(3 + EMPIRICAL_PROFILES.length);
    expect(loaded[0].id).toBe(AIKI_DEFAULT_PROFILE.id);
    expect(loaded[EMPIRICAL_PROFILES.length + 2].id).toBe(custom.id);
    expect(loaded[EMPIRICAL_PROFILES.length + 2].name).toBe('My Profile');
  });

  it('never persists the Aiki default profile to storage', () => {
    saveProfiles([AIKI_DEFAULT_PROFILE]);
    // Storage should be empty (or contain an empty array)
    const raw = localStorageMock.getItem('cwm.profiles');
    const stored: WaterProfile[] = raw ? JSON.parse(raw) : [];
    expect(stored.find(p => p.id === AIKI_DEFAULT_PROFILE.id)).toBeUndefined();
  });

  it('re-injects the Aiki default even when storage contains a stale copy', () => {
    // Simulate a corrupted/outdated storage that has a locked Aiki entry
    const staleAiki = { ...AIKI_DEFAULT_PROFILE, name: 'Outdated Name' };
    localStorageMock.setItem('cwm.profiles', JSON.stringify([staleAiki]));

    const profiles = loadProfiles();
    // The authoritative in-code version should win
    expect(profiles[0].name).toBe(AIKI_DEFAULT_PROFILE.name);
    expect(profiles).toHaveLength(2 + EMPIRICAL_PROFILES.length); // stale copy stripped, not duplicated
  });

  it('migrates a stored profile that is missing newly added ion keys', () => {
    // Build a profile with one ion key missing
    const custom = makeCustomProfile('Legacy');
    const { sodium: _omitted, ...rangesWithoutSodium } = custom.ranges;
    const legacy: WaterProfile = { ...custom, ranges: rangesWithoutSodium as RangeSet };

    localStorageMock.setItem('cwm.profiles', JSON.stringify([legacy]));
    const profiles = loadProfiles();
    const migrated = profiles.find(p => p.id === custom.id)!;

    // Missing key should be back-filled from IONS defaults
    expect(migrated.ranges.sodium).toBeDefined();
    const defaultSodium = IONS.find(i => i.id === 'sodium')!;
    expect(migrated.ranges.sodium.greenMax).toBe(defaultSodium.greenMax);
    expect(migrated.ranges.sodium.yellowMax).toBe(defaultSodium.yellowMax);
  });

  it('preserves multiple custom profiles across a round-trip', () => {
    const a = makeCustomProfile('Alpha');
    const b = makeCustomProfile('Beta');
    saveProfiles([AIKI_DEFAULT_PROFILE, a, b]);

    const loaded = loadProfiles();
    expect(loaded).toHaveLength(4 + EMPIRICAL_PROFILES.length);
    expect(loaded.map(p => p.id)).toContain(a.id);
    expect(loaded.map(p => p.id)).toContain(b.id);
  });

  it('handles corrupt JSON in storage gracefully, returning built-in profiles', () => {
    localStorageMock.setItem('cwm.profiles', '{NOT_VALID_JSON');
    const profiles = loadProfiles();
    expect(profiles).toHaveLength(2 + EMPIRICAL_PROFILES.length);
    expect(profiles[0].id).toBe(AIKI_DEFAULT_PROFILE.id);
  });
});

// ─── loadActiveProfileId / saveActiveProfileId ────────────────────────────────

describe('loadActiveProfileId / saveActiveProfileId', () => {
  beforeEach(() => localStorageMock.clear());

  it('returns the Aiki default id when nothing is stored', () => {
    expect(loadActiveProfileId()).toBe(AIKI_DEFAULT_PROFILE.id);
  });

  it('round-trips an active profile id correctly', () => {
    const custom = makeCustomProfile('Espresso');
    saveActiveProfileId(custom.id);
    expect(loadActiveProfileId()).toBe(custom.id);
  });
});

// ─── classifyIon uses the active profile's ranges, not the defaults ───────────

describe('classifyIon respects profile-specific ranges', () => {
  it('classifies green when ppm is below a CUSTOM greenMax', () => {
    // Custom profile where magnesium greenMax is 50 (much higher than default 20)
    const ranges: IonRanges = { greenMax: 50, yellowMax: 80 };
    // 30 ppm is red under default (greenMax=20, yellowMax=40) but green under custom
    expect(classifyIon(30, ranges)).toBe('green');
  });

  it('classifies yellow when ppm is between custom greenMax and yellowMax', () => {
    const ranges: IonRanges = { greenMax: 50, yellowMax: 80 };
    expect(classifyIon(65, ranges)).toBe('yellow');
  });

  it('classifies red when ppm exceeds the custom yellowMax', () => {
    const ranges: IonRanges = { greenMax: 50, yellowMax: 80 };
    expect(classifyIon(100, ranges)).toBe('red');
  });

  it('does NOT use default IonInfo thresholds when IonRanges are supplied', () => {
    // Default magnesium: greenMax=20, yellowMax=40
    // Custom ranges deliberately inverted to very tight limits
    const tightRanges: IonRanges = { greenMax: 1, yellowMax: 2 };
    // 5 ppm would be green under defaults but red under tight ranges
    expect(classifyIon(5, tightRanges)).toBe('red');
  });

  it('classifies correctly using default IonInfo when no custom ranges are passed', () => {
    const magnesiumInfo = IONS.find(i => i.id === 'magnesium')!;
    // Below default greenMax of 20 → green
    expect(classifyIon(10, magnesiumInfo)).toBe('green');
    // Between 20 and 40 → yellow
    expect(classifyIon(25, magnesiumInfo)).toBe('yellow');
    // Above 40 → red
    expect(classifyIon(50, magnesiumInfo)).toBe('red');
  });

  it('green boundary is exclusive (ppm exactly at greenMax → yellow)', () => {
    const ranges: IonRanges = { greenMax: 20, yellowMax: 40 };
    expect(classifyIon(20, ranges)).toBe('yellow');
  });

  it('yellow boundary is inclusive (ppm exactly at yellowMax → yellow)', () => {
    const ranges: IonRanges = { greenMax: 20, yellowMax: 40 };
    expect(classifyIon(40, ranges)).toBe('yellow');
  });

  it('just above yellowMax → red', () => {
    const ranges: IonRanges = { greenMax: 20, yellowMax: 40 };
    expect(classifyIon(40.001, ranges)).toBe('red');
  });
});

// ─── createProfile ────────────────────────────────────────────────────────────

describe('createProfile', () => {
  it('creates a profile with a unique id, the given name, and locked=false', () => {
    const ranges = emptyRangeSet();
    const p = createProfile('Test', ranges);
    expect(p.name).toBe('Test');
    expect(p.locked).toBe(false);
    expect(p.id).toMatch(/^user-/);
    expect(p.ranges).toBe(ranges);
  });

  it('generates distinct ids for two profiles created in the same tick', () => {
    const ranges = emptyRangeSet();
    const a = createProfile('A', ranges);
    const b = createProfile('B', ranges);
    expect(a.id).not.toBe(b.id);
  });
});

// ─── emptyRangeSet ───────────────────────────────────────────────────────────

describe('emptyRangeSet', () => {
  it('includes every ACTIVE_ION_ID with non-zero thresholds', () => {
    const rs = emptyRangeSet();
    for (const ion of IONS) {
      // emptyRangeSet only covers ACTIVE_ION_IDS, so skip inactive ones
      if (rs[ion.id] === undefined) continue;
      expect(rs[ion.id].greenMax).toBeGreaterThan(0);
      expect(rs[ion.id].yellowMax).toBeGreaterThan(rs[ion.id].greenMax);
    }
  });
});

// ─── delete active profile falls back correctly ───────────────────────────────

describe('deleting the active profile falls back to Aiki default', () => {
  beforeEach(() => localStorageMock.clear());

  it('falls back to Aiki default id when the active profile is removed', () => {
    const custom = makeCustomProfile('Espresso Blend');
    saveProfiles([AIKI_DEFAULT_PROFILE, custom]);
    saveActiveProfileId(custom.id);

    // Simulate deletion: save without the custom profile, reset active to default
    saveProfiles([AIKI_DEFAULT_PROFILE]);
    saveActiveProfileId(AIKI_DEFAULT_PROFILE.id);

    const profiles = loadProfiles();
    const activeId = loadActiveProfileId();

    expect(profiles.find(p => p.id === custom.id)).toBeUndefined();
    expect(activeId).toBe(AIKI_DEFAULT_PROFILE.id);
    // The Aiki default is still present
    expect(profiles[0].id).toBe(AIKI_DEFAULT_PROFILE.id);
  });

  it('loadActiveProfileId returns Aiki default when storage is cleared', () => {
    saveActiveProfileId('some-custom-id');
    localStorageMock.removeItem('cwm.activeProfileId');
    expect(loadActiveProfileId()).toBe(AIKI_DEFAULT_PROFILE.id);
  });

  it('profiles list still contains Aiki default after all custom profiles removed', () => {
    const c1 = makeCustomProfile('One');
    const c2 = makeCustomProfile('Two');
    saveProfiles([AIKI_DEFAULT_PROFILE, c1, c2]);

    // Delete all custom
    saveProfiles([AIKI_DEFAULT_PROFILE]);
    const profiles = loadProfiles();
    expect(profiles).toHaveLength(2 + EMPIRICAL_PROFILES.length);
    expect(profiles[0].id).toBe(AIKI_DEFAULT_PROFILE.id);
  });
});
