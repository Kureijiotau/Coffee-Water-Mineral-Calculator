import { expect, it } from 'vitest';
import { SaveAccountSyncDataBody } from '../../../lib/api-zod/src/generated/api';
it('retains versioned mass stocks and water-calibration provenance through the account API contract', () => {
  const massStockPlan = { version: 2, basis: 'mass', strategy: 'individual', finalLiters: 1, workspaceMode: 'diy', toolMode: 'recipe',
    selectedSaltId: 'mgso4', groups: [{ id: 'diy-mgso4', totalStockMassG: 100, strength: 20, saltIds: ['mgso4'], calibration: null }],
    recipe: { mgso4: { target: 30, formIdx: 1 } } };
  const lotusCalibrationInputs = { straight: { dropsInput: '100', weightInput: '5', style: 'straight' } };
  const result = SaveAccountSyncDataBody.parse({ expectedRevision: 0, alchemistProfiles: [], watermancerProfiles: [],
    diyConcentrateInputs: { massStockPlan, lotusCalibrationInputs, stockVolumeInput: '59' }, waterTastings: [], waterTastingDeletions: [] });
  expect(result.diyConcentrateInputs).toEqual({ massStockPlan, lotusCalibrationInputs, stockVolumeInput: '59' });
});
