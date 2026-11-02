import type { StockDropCalibration } from './concentrateMass';
import { SALTS } from './waterData';
export type MassConcentratePlanSnapshot = {
  version: 2; basis: 'mass'; strategy: 'individual' | 'gh-kh' | 'all-in-one'; finalLiters: number;
  workspaceMode?: 'recipe' | 'diy';
  toolMode?: 'recipe' | 'percent' | 'lotus';
  selectedSaltId?: string;
  dropperStyle?: 'straight' | 'round';
  percentWw?: number;
  recipe?: Record<string, { target: number; formIdx: number }>;
  legacyVolumePlan?: Record<string, unknown>;
  groups: Array<{ id: string; totalStockMassG: number; strength: number; batchScale?: number; desiredSaltMassMg?: number; physicalSaltPpmPerDrop?: number; caCo3PpmPerDrop?: number; saltIds: string[]; calibration: StockDropCalibration | null }>;
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
      || 'volumeMl' in g || !Array.isArray(g.saltIds) || !g.saltIds.length || !g.saltIds.every(s => typeof s === 'string' && SALTS.some(salt => salt.id === s))
      || (g.calibration !== null && !isStockDropCalibration(g.calibration)))
      return { kind: 'invalid', reason: 'Invalid stock group, calibration, or mixed mass/volume units.' };
    if (g.batchScale !== undefined && !positive(g.batchScale)) return { kind: 'invalid', reason: 'Invalid prepared stock batch scale.' };
    if (g.desiredSaltMassMg !== undefined && !positive(g.desiredSaltMassMg)) return { kind: 'invalid', reason: 'Invalid desired salt dose.' };
    if (g.physicalSaltPpmPerDrop !== undefined && !positive(g.physicalSaltPpmPerDrop)) return { kind: 'invalid', reason: 'Invalid physical-salt drop target.' };
    if (g.caCo3PpmPerDrop !== undefined && (!positive(g.caCo3PpmPerDrop) || g.physicalSaltPpmPerDrop !== undefined))
      return { kind: 'invalid', reason: 'Invalid or conflicting CaCO3-equivalent drop target.' };
    groups.push({ id: g.id, totalStockMassG: g.totalStockMassG, strength: g.strength, saltIds: g.saltIds, calibration: g.calibration,
      ...(positive(g.batchScale) ? { batchScale: g.batchScale } : {}),
      ...(positive(g.desiredSaltMassMg) ? { desiredSaltMassMg: g.desiredSaltMassMg } : {}),
      ...(positive(g.physicalSaltPpmPerDrop) ? { physicalSaltPpmPerDrop: g.physicalSaltPpmPerDrop } : {}),
      ...(positive(g.caCo3PpmPerDrop) ? { caCo3PpmPerDrop: g.caCo3PpmPerDrop } : {}) });
  }
  if (new Set(groups.map(g => g.id)).size !== groups.length) return { kind: 'invalid', reason: 'Duplicate stock groups.' };
  const plan: MassConcentratePlanSnapshot = { version: 2, basis: 'mass', strategy: value.strategy as MassConcentratePlanSnapshot['strategy'], finalLiters: value.finalLiters, groups };
  if (value.workspaceMode === 'recipe' || value.workspaceMode === 'diy') plan.workspaceMode = value.workspaceMode;
  if (value.toolMode === 'recipe' || value.toolMode === 'percent' || value.toolMode === 'lotus') plan.toolMode = value.toolMode;
  if (value.dropperStyle === 'straight' || value.dropperStyle === 'round') plan.dropperStyle = value.dropperStyle;
  if (value.selectedSaltId !== undefined) {
    if (typeof value.selectedSaltId !== 'string' || !SALTS.some(salt => salt.id === value.selectedSaltId))
      return { kind: 'invalid', reason: 'Unknown stock salt.' };
    plan.selectedSaltId = value.selectedSaltId;
  }
  if (value.percentWw !== undefined && (!positive(value.percentWw) || value.percentWw >= 100))
    return { kind: 'invalid', reason: 'Stock percent w/w must be between 0 and 100.' };
  if (positive(value.percentWw) && value.percentWw < 100) plan.percentWw = value.percentWw;
  if (value.recipe !== undefined) {
    if (!isRecord(value.recipe)) return { kind: 'invalid', reason: 'Invalid stock recipe.' };
    plan.recipe = {};
    for (const [id, row] of Object.entries(value.recipe)) {
      if (!isRecord(row) || !positive(row.target) || !Number.isInteger(row.formIdx) || Number(row.formIdx) < 0)
        return { kind: 'invalid', reason: 'Invalid stock recipe salt/form.' };
      if (!SALTS.find(salt => salt.id === id)?.hydrationForms[Number(row.formIdx)])
        return { kind: 'invalid', reason: 'Unknown stock recipe salt or hydration form.' };
      plan.recipe[id] = { target: row.target, formIdx: Number(row.formIdx) };
    }
  }
  if (isRecord(value.legacyVolumePlan)) plan.legacyVolumePlan = value.legacyVolumePlan;
  return { kind: 'mass', plan };
}

/** Historical standalone fields were explicitly total grams and % w/w. */
export function readStandaloneMassSnapshot(value: unknown) {
  if (!isRecord(value) || value.mode !== 'builder' || value.recipeConcentratePlan != null) return null;
  const salt = SALTS.find(s => s.id === value.saltId);
  const totalStockMassG = Number(value.totalStockMassInput), percentWw = Number(value.strengthInput);
  const formIdx = Number(value.formIdx);
  if (!salt?.hydrationForms[formIdx] || !positive(totalStockMassG) || !positive(percentWw) || percentWw >= 100) return null;
  const plan: MassConcentratePlanSnapshot = { version: 2, basis: 'mass', workspaceMode: 'diy', toolMode: 'percent',
    selectedSaltId: salt.id, percentWw, strategy: 'individual', finalLiters: positive(Number(value.doseLiters)) ? Number(value.doseLiters) : 1,
    recipe: { [salt.id]: { target: 30, formIdx } },
    groups: [{ id: `diy-${salt.id}`, totalStockMassG, strength: 1, saltIds: [salt.id], calibration: null }] };
  return plan;
}
