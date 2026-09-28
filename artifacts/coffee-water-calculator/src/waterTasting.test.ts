import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildWaterTastingProfileOptions,
  calculateWaterTastingTotal,
  createWaterTastingRecord,
  loadWaterTastings,
  saveWaterTastings,
  sortWaterTastingsNewestFirst,
  updateWaterTastingRecord,
  WATER_TASTING_RATINGS,
  WATER_TASTING_STORAGE_KEY,
  type WaterTastingDraft,
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

function makeDraft(overrides: Partial<WaterTastingDraft> = {}): WaterTastingDraft {
  return {
    profileSourceId: 'saved:water-1',
    profileNameSnapshot: 'Bright Water',
    coffee: {},
    ratings: {},
    descriptorIds: [],
    ...overrides,
  };
}

function makeRecord(id: string, createdAt: string): WaterTastingRecord {
  return createWaterTastingRecord(makeDraft(), new Date(createdAt), id);
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

describe('Water Tasting profile options', () => {
  it('offers built-in, Alchemist, and Watermancer profiles in separate groups', () => {
    expect(buildWaterTastingProfileOptions(
      [
        { id: 'aiki-default', name: 'Aiki' },
        { id: 'empirical-1', name: 'Empirical Water ionic profile' },
        { id: 'custom-1', name: 'My custom profile' },
      ],
      [{ id: 'water-1', name: 'Bright Water' }],
      'Aiki',
    )).toEqual([
      { sourceId: 'safe-profile', name: 'Aiki safe profile', group: 'Built-in' },
      { sourceId: 'salt-table', name: 'Current salt table', group: 'Built-in' },
      { sourceId: 'alchemist:aiki-default', name: 'Aiki', group: 'Alchemist' },
      { sourceId: 'alchemist:empirical-1', name: 'Empirical Water ionic profile', group: 'Alchemist' },
      { sourceId: 'alchemist:custom-1', name: 'My custom profile', group: 'Alchemist' },
      { sourceId: 'saved:water-1', name: 'Bright Water', group: 'Watermancer' },
    ]);
  });

  it('reflects profiles added to either current source collection', () => {
    const alchemistProfiles = [{ id: 'custom-1', name: 'First profile' }];
    const watermancerProfiles: Array<{ id: string; name: string }> = [];
    const initial = buildWaterTastingProfileOptions(alchemistProfiles, watermancerProfiles, 'Aiki');
    expect(initial.some(option => option.sourceId === 'alchemist:custom-2')).toBe(false);
    expect(initial.some(option => option.sourceId === 'saved:water-2')).toBe(false);

    alchemistProfiles.push({ id: 'custom-2', name: 'New Alchemist profile' });
    watermancerProfiles.push({ id: 'water-2', name: 'New Watermancer profile' });
    const updated = buildWaterTastingProfileOptions(alchemistProfiles, watermancerProfiles, 'Aiki');

    expect(updated).toContainEqual({
      sourceId: 'alchemist:custom-2',
      name: 'New Alchemist profile',
      group: 'Alchemist',
    });
    expect(updated).toContainEqual({
      sourceId: 'saved:water-2',
      name: 'New Watermancer profile',
      group: 'Watermancer',
    });
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