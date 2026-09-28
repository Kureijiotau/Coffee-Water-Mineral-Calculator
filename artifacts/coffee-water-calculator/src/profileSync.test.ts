import { describe, expect, it } from 'vitest';
import { mergeProfileCollections, sameProfileCollection } from './profileSync';

interface TestProfile {
  id: string;
  name: string;
}

describe('cross-tab profile collection merge', () => {
  it('keeps pending local edits and merges independent remote additions and edits', () => {
    const baseline: TestProfile[] = [
      { id: 'one', name: 'Original one' },
      { id: 'two', name: 'Original two' },
    ];
    const local: TestProfile[] = [
      { id: 'one', name: 'Local edit' },
      { id: 'two', name: 'Original two' },
      { id: 'local-new', name: 'Local addition' },
    ];
    const remote: TestProfile[] = [
      { id: 'one', name: 'Original one' },
      { id: 'two', name: 'Remote edit' },
      { id: 'remote-new', name: 'Remote addition' },
    ];

    expect(mergeProfileCollections(baseline, local, remote)).toEqual([
      { id: 'one', name: 'Local edit' },
      { id: 'two', name: 'Remote edit' },
      { id: 'remote-new', name: 'Remote addition' },
      { id: 'local-new', name: 'Local addition' },
    ]);
  });

  it('keeps a local deletion over a remote edit and keeps a remote deletion when locally unchanged', () => {
    const baseline: TestProfile[] = [
      { id: 'local-delete', name: 'Delete locally' },
      { id: 'remote-delete', name: 'Delete remotely' },
      { id: 'unchanged', name: 'Keep' },
    ];
    const local: TestProfile[] = [
      { id: 'remote-delete', name: 'Delete remotely' },
      { id: 'unchanged', name: 'Keep' },
    ];
    const remote: TestProfile[] = [
      { id: 'local-delete', name: 'Remote edit' },
      { id: 'unchanged', name: 'Keep' },
    ];

    expect(mergeProfileCollections(baseline, local, remote)).toEqual([
      { id: 'unchanged', name: 'Keep' },
    ]);
  });

  it('uses the local value when both tabs changed the same profile', () => {
    expect(mergeProfileCollections(
      [{ id: 'one', name: 'Original' }],
      [{ id: 'one', name: 'Local' }],
      [{ id: 'one', name: 'Remote' }],
    )).toEqual([{ id: 'one', name: 'Local' }]);
  });

  it('compares profile collections structurally, not by array identity', () => {
    expect(sameProfileCollection(
      [{ id: 'one', name: 'Same' }],
      [{ id: 'one', name: 'Same' }],
    )).toBe(true);
    expect(sameProfileCollection(
      [{ id: 'one', name: 'Local' }],
      [{ id: 'one', name: 'Remote' }],
    )).toBe(false);
  });
});