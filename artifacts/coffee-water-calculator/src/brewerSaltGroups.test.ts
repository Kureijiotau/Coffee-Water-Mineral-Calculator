import { describe, expect, it } from 'vitest';
import { buildBrewerSaltGroups } from './brewerSaltGroups';
import {
  SALTS,
  WATERMANCER_SALT_ORDER,
  type SaltInfo,
} from './waterData';

const saltsById = new Map(SALTS.map(salt => [salt.id, salt]));
const orderedRows = WATERMANCER_SALT_ORDER.map((id, index) => {
  const salt = saltsById.get(id);
  if (!salt) throw new Error(`Missing salt ${id} from SALTS`);
  return { salt, index: index + 100 };
});

describe('buildBrewerSaltGroups', () => {
  it('groups every catalog salt once in GH, KH, then Additional ions order', () => {
    const groups = buildBrewerSaltGroups(orderedRows);

    expect(groups.map(({ id, label }) => [id, label])).toEqual([
      ['gh', 'GH contributors'],
      ['kh', 'KH contributors'],
      ['additional', 'Additional ions'],
    ]);
    expect(groups.map(group => group.rows.map(row => row.salt.id))).toEqual([
      ['mgcl2', 'cacl2', 'mgso4', 'caso4', 'calact', 'mggly', 'mgmalate', 'mgcit', 'cacit'],
      ['nahco3', 'khco3'],
      ['nacl', 'kcl'],
    ]);

    const groupedRows = groups.flatMap(group => group.rows);
    expect(groupedRows).toHaveLength(SALTS.length);
    expect(new Set(groupedRows.map(row => row.salt.id)).size).toBe(SALTS.length);
    expect(groupedRows.map(row => row.index)).toEqual([
      100, 101, 104, 105, 108, 109, 110, 111, 112, 106, 107, 102, 103,
    ]);
    expect(groupedRows.flatMap(row => row.salt.id).sort()).toEqual(
      SALTS.map(salt => salt.id).sort(),
    );
  });

  it('places a dual GH/KH contributor once under GH and keeps both contribution flags', () => {
    const dualContributorSalt: SaltInfo = {
      ...SALTS[0],
      id: 'synthetic-gh-kh-salt',
      ions: [
        { ionId: 'calcium', fraction: 0.4 },
        { ionId: 'bicarbonate', fraction: 0.6 },
      ],
    };

    const groups = buildBrewerSaltGroups([{ salt: dualContributorSalt, index: 23 }]);

    expect(groups[0].rows).toEqual([{
      salt: dualContributorSalt,
      index: 23,
      contributesToGh: true,
      contributesToKh: true,
    }]);
    expect(groups.flatMap(group => group.rows).map(row => row.salt.id)).toEqual([
      'synthetic-gh-kh-salt',
    ]);
  });
});
