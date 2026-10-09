import type { SaltInfo } from './waterData';

export type BrewerSaltGroupId = 'gh' | 'kh' | 'additional';

export type BrewerSaltRow = {
  salt: SaltInfo;
  index: number;
  contributesToGh: boolean;
  contributesToKh: boolean;
};

export type BrewerSaltGroup = {
  id: BrewerSaltGroupId;
  label: 'GH contributors' | 'KH contributors' | 'Additional ions';
  rows: BrewerSaltRow[];
};

const GH_ION_IDS = new Set(['calcium', 'magnesium']);
const KH_ION_IDS = new Set(['bicarbonate', 'carbonate']);

export function buildBrewerSaltGroups(
  rows: readonly { salt: SaltInfo; index: number }[],
): BrewerSaltGroup[] {
  const groups: BrewerSaltGroup[] = [
    { id: 'gh', label: 'GH contributors', rows: [] },
    { id: 'kh', label: 'KH contributors', rows: [] },
    { id: 'additional', label: 'Additional ions', rows: [] },
  ];

  for (const row of rows) {
    const contributesToGh = row.salt.ions.some(
      contribution => GH_ION_IDS.has(contribution.ionId) && contribution.fraction > 0,
    );
    const contributesToKh = row.salt.ions.some(
      contribution => KH_ION_IDS.has(contribution.ionId) && contribution.fraction > 0,
    );
    const group = contributesToGh ? groups[0] : contributesToKh ? groups[1] : groups[2];

    group.rows.push({
      ...row,
      contributesToGh,
      contributesToKh,
    });
  }

  return groups;
}
