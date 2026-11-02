import type { StockDropCalibration } from './concentrateMass';
export type MassConcentratePlanSnapshot = {
  version: 2; basis: 'mass'; strategy: 'individual' | 'gh-kh' | 'all-in-one'; finalLiters: number;
  groups: Array<{ id: string; totalStockMassG: number; strength: number; saltIds: string[]; calibration: StockDropCalibration | null }>;
};
export const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
export function isStockDropCalibration(v: unknown): v is StockDropCalibration {
  return isRecord(v) && (v.basis === 'stock' || v.basis === 'water-estimate')
    && positive(v.drops) && positive(v.massG) && typeof v.compositionKey === 'string' && typeof v.tipKey === 'string';
}
export function readConcentrateStockRecord(value: unknown):
  | { kind: 'mass'; plan: MassConcentratePlanSnapshot }
  | { kind: 'legacy-volume'; original: Record<string, unknown> }
  | { kind: 'invalid'; reason: string } {
  if (!isRecord(value)) return { kind: 'invalid', reason: 'Missing concentrate plan.' };
  if (value.version === undefined && value.basis === undefined && Array.isArray(value.groups)
    && value.groups.length > 0 && value.groups.every(g => isRecord(g) && positive(g.volumeMl)))
    return { kind: 'legacy-volume', original: value };
  if (value.version !== 2 || value.basis !== 'mass'
    || !['individual', 'gh-kh', 'all-in-one'].includes(String(value.strategy)) || !positive(value.finalLiters)
    || !Array.isArray(value.groups) || !value.groups.length)
    return { kind: 'invalid', reason: 'Unsupported or incomplete concentrate mass plan.' };
  const groups: MassConcentratePlanSnapshot['groups'] = [];
  for (const g of value.groups) {
    if (!isRecord(g) || typeof g.id !== 'string' || !g.id || !positive(g.totalStockMassG) || !positive(g.strength)
      || 'volumeMl' in g || !Array.isArray(g.saltIds) || !g.saltIds.length || !g.saltIds.every(s => typeof s === 'string')
      || (g.calibration !== null && !isStockDropCalibration(g.calibration)))
      return { kind: 'invalid', reason: 'Invalid stock group, calibration, or mixed mass/volume units.' };
    groups.push({ id: g.id, totalStockMassG: g.totalStockMassG, strength: g.strength, saltIds: g.saltIds, calibration: g.calibration });
  }
  if (new Set(groups.map(g => g.id)).size !== groups.length) return { kind: 'invalid', reason: 'Duplicate stock groups.' };
  return { kind: 'mass', plan: { version: 2, basis: 'mass', strategy: value.strategy as MassConcentratePlanSnapshot['strategy'], finalLiters: value.finalLiters, groups } };
}
