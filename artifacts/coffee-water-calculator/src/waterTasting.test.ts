import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildWaterTastingProfileOptions,
  calculateWaterTastingTotal,
  createWaterTastingRecord,
  createNeutralWaterTastingSpectrum,
  loadWaterTastings,
  saveWaterTastings,
  sortWaterTastingsNewestFirst,
  updateWaterTastingRecord,
  WATER_TASTING_DESCRIPTORS,
  WATER_TASTING_AFFECTIVE_ANCHORS,
  WATER_TASTING_AFFECTIVE_ATTRIBUTES,
  WATER_TASTING_DESCRIPTIVE_ATTRIBUTES,
  WATER_TASTING_RATINGS,
  WATER_TASTING_SPECTRUM,
  WATER_TASTING_STORAGE_KEY,
  getWaterTastingAffectiveCue,
  getWaterTastingDescriptiveCue,
  type WaterTastingCvaDraft,
  type WaterTastingCvaRecord,
  type WaterTastingLegacyDraft,
  type WaterTastingLegacyRecord,
  type WaterTastingRecord,
  type WaterTastingStorage,
} from './waterTasting';

function makeStorage(): WaterTastingStorage & { values: Record<string, string> } {
  const values: Record<string, string> = {};
  return {
    values,
    getItem: key => Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null,
    setItem: (key, value) => {
      values[key] = value;
    },
  };
}

function makeDraft(overrides: Partial<WaterTastingLegacyDraft> = {}): WaterTastingLegacyDraft {
  return {
    profileSourceId: 'saved:water-1',
    profileNameSnapshot: 'Bright Water',
    coffee: {},
    ratings: {},
    spectrum: createNeutralWaterTastingSpectrum(),
    descriptorIds: [],
    ...overrides,
  };
}

function makeRecord(id: string, createdAt: string): WaterTastingLegacyRecord {
  return createWaterTastingRecord(makeDraft(), new Date(createdAt), id);
}

function makeCvaDraft(
  overrides: Partial<Omit<WaterTastingCvaDraft, 'scoringVersion'>> = {},
): WaterTastingCvaDraft {
  return {
    profileSourceId: 'saved:water-1',
    profileNameSnapshot: 'Bright Water',
    coffee: {},
    scoringVersion: 2,
    descriptive: {},
    affective: {},
    descriptorIds: [],
    ...overrides,
  };
}

describe('Water Tasting score model', () => {
  it('does not show a total until all five ratings are present', () => {
    expect(calculateWaterTastingTotal({ clarity: 10, flavorExpression: 8, balance: 7, mouthfeel: 6 })).toBeNull();
    expect(WATER_TASTING_RATINGS).toHaveLength(5);
  });

  it('sums all five ratings equally, including valid zeroes', () => {
    expect(calculateWaterTastingTotal({
      clarity: 0,
      flavorExpression: 10,
      balance: 10,
      mouthfeel: 10,
      finish: 10,
    })).toBe(40);
    expect(calculateWaterTastingTotal({
      clarity: 10,
      flavorExpression: 10,
      balance: 10,
      mouthfeel: 10,
      finish: 10,
    })).toBe(50);
  });

  it('rejects out-of-range and fractional ratings from total calculation', () => {
    expect(calculateWaterTastingTotal({
      clarity: 11,
      flavorExpression: 8,
      balance: 7,
      mouthfeel: 6,
      finish: 5,
    })).toBeNull();
    expect(calculateWaterTastingTotal({
      clarity: 8.5,
      flavorExpression: 8,
      balance: 7,
      mouthfeel: 6,
      finish: 5,
    })).toBeNull();
  });
});

describe('Water Tasting cup shape and descriptors', () => {
  it('defaults all four spectrum directions to neutral zero', () => {
    expect(createNeutralWaterTastingSpectrum()).toEqual({
      acidityFocus: 0,
      bodyWeight: 0,
      structure: 0,
      finish: 0,
    });
    expect(WATER_TASTING_SPECTRUM).toHaveLength(4);
  });

  it('keeps existing descriptor IDs and adds the requested groups and words', () => {
    const groupIds = WATER_TASTING_DESCRIPTORS.map(group => group.id);
    const descriptorIds = WATER_TASTING_DESCRIPTORS.flatMap(group => (
      group.options.map(option => option.id)
    ));

    expect(groupIds).toEqual([
      'fragrance-aroma',
      'flavor',
      'main-tastes',
      'mouthfeel',
    ]);
    expect(descriptorIds).toEqual(expect.arrayContaining([
      'clean-neutral',
      'crisp',
      'rounded',
      'thin',
      'full-coating',
      'drying',
      'muted',
      'short-finish',
      'lingering-finish',
      'sparkling',
      'tart',
      'jammy',
      'hollow',
      'juicy',
      'syrupy',
      'tannic-astringent',
      'muddy',
      'flat',
      'clean-finish',
    ]));
  });
});

describe('Water Tasting CVA-informed scales', () => {
  it('provides an attribute-specific cue for every descriptive score', () => {
    for (const attribute of WATER_TASTING_DESCRIPTIVE_ATTRIBUTES) {
      for (let value = 0; value <= 15; value += 1) {
        expect(getWaterTastingDescriptiveCue(attribute.id, value)).toBeTruthy();
      }
    }
    expect(getWaterTastingDescriptiveCue('mouthfeel', 3)).toContain('tea-like');
    expect(getWaterTastingDescriptiveCue('mouthfeel', 12)).toContain('coating');
    expect(getWaterTastingDescriptiveCue('flavor', -1)).toBeUndefined();
    expect(getWaterTastingDescriptiveCue('flavor', 15.5)).toBeUndefined();
  });

  it('defines seven descriptive attributes and five affective attributes with all SCA anchors', () => {
    expect(WATER_TASTING_DESCRIPTIVE_ATTRIBUTES).toHaveLength(7);
    expect(WATER_TASTING_AFFECTIVE_ATTRIBUTES).toHaveLength(5);
    expect(WATER_TASTING_AFFECTIVE_ANCHORS.map(({ value }) => value))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(WATER_TASTING_AFFECTIVE_ANCHORS.map(({ label }) => label)).toEqual([
      'Extremely low',
      'Very low',
      'Moderately low',
      'Slightly low',
      'Neither high nor low',
      'Slightly high',
      'Moderately high',
      'Very high',
      'Extremely high',
    ]);
    expect(getWaterTastingAffectiveCue(1)).toBe('Extremely low');
    expect(getWaterTastingAffectiveCue(5)).toBe('Neither high nor low');
    expect(getWaterTastingAffectiveCue(9)).toBe('Extremely high');
    expect(getWaterTastingAffectiveCue(10)).toBeUndefined();
  });
});

describe('Water Tasting profile options', () => {
  it('keeps both mode catalogs in exactly two groups with their own readings', () => {
    const options = buildWaterTastingProfileOptions(
      [
        {
          sourceId: 'alchemist:setup:current',
          name: 'Current setup',
          readings: { ions: { calcium: 24 } },
        },
        {
          sourceId: 'alchemist:recipe:builtin:kimoi',
          name: 'Kimoi Water',
          readings: { ions: { sodium: 4 } },
        },
      ],
      [
        {
          sourceId: 'safe-profile',
          name: 'Aiki safe profile',
          readings: { ions: { sodium: 3 } },
        },
        {
          sourceId: 'watermancer:sensory-profile',
          name: 'Watermancer Sensory',
          readings: { ions: { calcium: 28 } },
        },
      ],
    );

    expect(options.map(({ sourceId, name, group }) => ({ sourceId, name, group }))).toEqual([
      { sourceId: 'alchemist:setup:current', name: 'Current setup', group: 'Alchemist' },
      { sourceId: 'alchemist:recipe:builtin:kimoi', name: 'Kimoi Water', group: 'Alchemist' },
      { sourceId: 'safe-profile', name: 'Aiki safe profile', group: 'Watermancer' },
      { sourceId: 'watermancer:sensory-profile', name: 'Watermancer Sensory', group: 'Watermancer' },
    ]);
    expect(options.find(option => option.sourceId === 'alchemist:setup:current')?.readings.ions)
      .toEqual({ calcium: 24 });
    expect(options.find(option => option.sourceId === 'safe-profile')?.readings.ions)
      .toEqual({ sodium: 3 });
    expect(new Set(options.map(option => option.sourceId)).size).toBe(options.length);
  });

  it('rejects duplicate source IDs rather than creating ambiguous picker entries', () => {
    const duplicate = {
      sourceId: 'shared-id',
      name: 'Duplicate',
      readings: { ions: {} },
    };
    expect(() => buildWaterTastingProfileOptions([duplicate], [duplicate]))
      .toThrow('Duplicate Water Tasting source ID: shared-id');
  });
});

describe('Water Tasting record lifecycle', () => {
  it('captures profile ID/name snapshots and normalizes optional coffee details', () => {
    const record = createWaterTastingRecord(makeDraft({
      coffee: { name: '  Ethiopia  ', roast: '', origin: '  Sidama ' },
      ratings: { clarity: 7 },
      descriptorIds: ['mineral'],
    }), new Date('2026-09-28T09:00:00.000Z'), 'tasting-1');

    expect(record).toMatchObject({
      id: 'tasting-1',
      profileSourceId: 'saved:water-1',
      profileNameSnapshot: 'Bright Water',
      coffee: { name: 'Ethiopia', origin: 'Sidama' },
      ratings: { clarity: 7 },
      descriptorIds: ['mineral'],
    });
    expect(record.createdAt).toBe(record.updatedAt);
    expect(record).not.toHaveProperty('total');
  });

  it('updates a record while preserving its ID and creation time', () => {
    const original = makeRecord('tasting-1', '2026-09-27T09:00:00.000Z');
    const updated = updateWaterTastingRecord(
      original,
      makeDraft({
        profileSourceId: 'safe-profile',
        profileNameSnapshot: 'Aiki safe profile',
        ratings: { clarity: 8, flavorExpression: 8, balance: 8, mouthfeel: 8, finish: 8 },
      }),
      new Date('2026-09-28T09:00:00.000Z'),
    );

    expect(updated.id).toBe(original.id);
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.updatedAt).not.toBe(original.updatedAt);
    expect(updated.profileNameSnapshot).toBe('Aiki safe profile');
  });

  it('creates and updates version 2 records without changing their water identity', () => {
    const original = createWaterTastingRecord(makeCvaDraft({
      descriptive: { fragrance: 0, mouthfeel: 15 },
      affective: { overall: 9 },
      descriptorIds: ['mineral'],
    }), new Date('2026-09-27T09:00:00.000Z'), 'cva-tasting');
    const updated = updateWaterTastingRecord(
      original,
      makeCvaDraft({
        profileSourceId: 'saved:renamed-water',
        profileNameSnapshot: 'Renamed water',
        coffee: { name: 'Ethiopia' },
        descriptive: { flavor: 7 },
        affective: { overall: 8 },
        descriptorIds: ['clean-neutral'],
      }),
      new Date('2026-09-28T09:00:00.000Z'),
    );

    expect(original).toMatchObject({
      scoringVersion: 2,
      profileSourceId: 'saved:water-1',
      profileNameSnapshot: 'Bright Water',
      descriptive: { fragrance: 0, mouthfeel: 15 },
      affective: { overall: 9 },
    } satisfies Partial<WaterTastingCvaRecord>);
    expect(updated).toMatchObject({
      scoringVersion: 2,
      profileSourceId: 'saved:renamed-water',
      profileNameSnapshot: 'Renamed water',
      coffee: { name: 'Ethiopia' },
      descriptive: { flavor: 7 },
      affective: { overall: 8 },
      descriptorIds: ['clean-neutral'],
    });
    expect(updated.id).toBe(original.id);
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.updatedAt).not.toBe(original.updatedAt);
  });

  it('sorts history newest first and keeps equal-date items stable', () => {
    const older = makeRecord('older', '2026-09-26T09:00:00.000Z');
    const sameDateA = makeRecord('same-a', '2026-09-27T09:00:00.000Z');
    const sameDateB = makeRecord('same-b', '2026-09-27T09:00:00.000Z');
    const newer = makeRecord('newer', '2026-09-28T09:00:00.000Z');

    expect(sortWaterTastingsNewestFirst([older, sameDateA, sameDateB, newer]).map(record => record.id))
      .toEqual(['newer', 'same-a', 'same-b', 'older']);
  });
});

describe('Water Tasting local persistence', () => {
  let storage: ReturnType<typeof makeStorage>;

  beforeEach(() => {
    storage = makeStorage();
  });

  it('round-trips valid tasting records', () => {
    const records = [makeRecord('tasting-1', '2026-09-28T09:00:00.000Z')];

    expect(saveWaterTastings(records, [], storage)).toEqual({ ok: true });
    expect(storage.values[WATER_TASTING_STORAGE_KEY]).toContain('"profileNameSnapshot":"Bright Water"');
    expect(loadWaterTastings(storage)).toEqual({ ok: true, records });
  });

  it('round-trips partial CVA records alongside legacy records', () => {
    const legacy = makeRecord('legacy', '2026-09-27T09:00:00.000Z');
    const cva = createWaterTastingRecord(makeCvaDraft({
      descriptive: { fragrance: 0, mouthfeel: 15 },
      affective: { overall: 9 },
      descriptorIds: ['syrupy'],
    }), new Date('2026-09-28T09:00:00.000Z'), 'cva');
    const records = [legacy, cva];

    expect(saveWaterTastings(records, [], storage)).toEqual({ ok: true });
    expect(loadWaterTastings(storage)).toEqual({ ok: true, records });
    expect(storage.values[WATER_TASTING_STORAGE_KEY]).toContain('"scoringVersion":2');
    expect(storage.values[WATER_TASTING_STORAGE_KEY]).not.toContain('"total"');
  });

  it('round-trips spectrum values and copies them when records are created or updated', () => {
    const spectrum = {
      acidityFocus: -5,
      bodyWeight: 2,
      structure: 0,
      finish: 5,
    };
    const record = createWaterTastingRecord(
      makeDraft({ spectrum }),
      new Date('2026-09-28T09:00:00.000Z'),
      'tasting-spectrum',
    );
    spectrum.acidityFocus = 3;
    expect(record.spectrum).toEqual({
      acidityFocus: -5,
      bodyWeight: 2,
      structure: 0,
      finish: 5,
    });

    const updated = updateWaterTastingRecord(
      record,
      makeDraft({ spectrum: { acidityFocus: 4, bodyWeight: -2, structure: 1, finish: 0 } }),
      new Date('2026-09-28T10:00:00.000Z'),
    );
    expect(updated.spectrum).toEqual({
      acidityFocus: 4,
      bodyWeight: -2,
      structure: 1,
      finish: 0,
    });

    expect(saveWaterTastings([updated], [], storage)).toEqual({ ok: true });
    expect(loadWaterTastings(storage)).toEqual({ ok: true, records: [updated] });
  });

  it('loads legacy records without spectrum without rewriting their stored data', () => {
    const { spectrum: _ignored, ...legacyRecord } = makeRecord(
      'legacy-tasting',
      '2026-09-27T09:00:00.000Z',
    );
    const original = JSON.stringify([legacyRecord]);
    storage.values[WATER_TASTING_STORAGE_KEY] = original;

    expect(loadWaterTastings(storage)).toEqual({ ok: true, records: [legacyRecord] });
    expect(storage.values[WATER_TASTING_STORAGE_KEY]).toBe(original);
  });

  it('rejects out-of-range spectrum values without overwriting saved data', () => {
    storage.values[WATER_TASTING_STORAGE_KEY] = 'original';
    const invalid = {
      ...makeRecord('invalid-spectrum', '2026-09-28T09:00:00.000Z'),
      spectrum: { ...createNeutralWaterTastingSpectrum(), finish: 6 },
    } as WaterTastingRecord;

    expect(saveWaterTastings([invalid], [], storage)).toEqual({ ok: false, error: 'invalid-records' });
    expect(storage.values[WATER_TASTING_STORAGE_KEY]).toBe('original');
  });

  it('loads an empty list without writing a new storage value', () => {
    expect(loadWaterTastings(storage)).toEqual({ ok: true, records: [] });
    expect(storage.values[WATER_TASTING_STORAGE_KEY]).toBeUndefined();
  });

  it('reports malformed stored data and leaves it untouched', () => {
    storage.values[WATER_TASTING_STORAGE_KEY] = '{not json';

    expect(loadWaterTastings(storage)).toEqual({ ok: false, error: 'invalid-data' });
    expect(storage.values[WATER_TASTING_STORAGE_KEY]).toBe('{not json');
  });

  it('rejects invalid records without overwriting saved data', () => {
    storage.values[WATER_TASTING_STORAGE_KEY] = 'original';
    const invalid = { ...makeRecord('tasting-1', '2026-09-28T09:00:00.000Z'), ratings: { clarity: 11 } };

    expect(saveWaterTastings([invalid as WaterTastingRecord], [], storage))
      .toEqual({ ok: false, error: 'invalid-records' });
    expect(storage.values[WATER_TASTING_STORAGE_KEY]).toBe('original');
  });

  it('rejects out-of-range CVA scores without overwriting saved data', () => {
    storage.values[WATER_TASTING_STORAGE_KEY] = 'original';
    const valid = createWaterTastingRecord(makeCvaDraft(), new Date('2026-09-28T09:00:00.000Z'), 'bad-cva');
    const invalid = {
      ...valid,
      descriptive: { fragrance: 16 },
    } as WaterTastingCvaRecord;

    expect(saveWaterTastings([invalid], [], storage)).toEqual({ ok: false, error: 'invalid-records' });
    expect(storage.values[WATER_TASTING_STORAGE_KEY]).toBe('original');
  });

  it('rejects duplicate record IDs', () => {
    const record = makeRecord('duplicate', '2026-09-28T09:00:00.000Z');
    expect(saveWaterTastings([record, record], [], storage))
      .toEqual({ ok: false, error: 'invalid-records' });
  });

  it('does not overwrite storage that became malformed after it was loaded', () => {
    const initialLoad = loadWaterTastings(storage);
    expect(initialLoad).toEqual({ ok: true, records: [] });
    storage.values[WATER_TASTING_STORAGE_KEY] = '{corrupted in another tab';

    expect(saveWaterTastings(
      [makeRecord('tasting-1', '2026-09-28T09:00:00.000Z')],
      initialLoad.records,
      storage,
    )).toEqual({ ok: false, error: 'invalid-data' });
    expect(storage.values[WATER_TASTING_STORAGE_KEY]).toBe('{corrupted in another tab');
  });

  it('does not overwrite a valid list changed after it was loaded', () => {
    const initialLoad = loadWaterTastings(storage);
    expect(initialLoad).toEqual({ ok: true, records: [] });
    const concurrentRecord = makeRecord('concurrent', '2026-09-27T09:00:00.000Z');
    expect(saveWaterTastings([concurrentRecord], initialLoad.records, storage)).toEqual({ ok: true });

    expect(saveWaterTastings(
      [makeRecord('local', '2026-09-28T09:00:00.000Z')],
      initialLoad.records,
      storage,
    )).toEqual({ ok: false, error: 'changed-data' });
    expect(loadWaterTastings(storage)).toEqual({ ok: true, records: [concurrentRecord] });
  });

  it('reports unavailable storage and write failures explicitly', () => {
    const readFailure: WaterTastingStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    const writeFailure: WaterTastingStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('quota'); },
    };

    expect(loadWaterTastings(readFailure)).toEqual({ ok: false, error: 'unavailable' });
    expect(saveWaterTastings([makeRecord('tasting-1', '2026-09-28T09:00:00.000Z')], [], writeFailure))
      .toEqual({ ok: false, error: 'write-failed' });
  });
});