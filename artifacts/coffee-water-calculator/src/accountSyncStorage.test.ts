import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DIY_CONCENTRATE_INPUTS_STORAGE_KEY,
  loadDiyConcentrateInputs,
  saveDiyConcentrateInputs,
  setAccountSyncScope,
} from './accountSyncStorage';

describe('DIY concentrate input storage', () => {
  const values = new Map<string, string>();

  afterEach(() => {
    values.clear();
    setAccountSyncScope(null);
    vi.unstubAllGlobals();
  });

  it('restores per-dropper Lotus calibration inputs and preserves them with other DIY edits', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    values.set(DIY_CONCENTRATE_INPUTS_STORAGE_KEY, JSON.stringify({
      stockWeightInput: '100',
      lotusCalibrationInputs: {
        magnesium: { dropsInput: '100', weightInput: '5', style: 'round' },
        calcium: { dropsInput: '90', weightInput: '4.5', style: 'straight' },
        invalid: { dropsInput: 90, weightInput: '4.5' },
      },
    }));

    const restored = loadDiyConcentrateInputs();
    expect(restored.lotusCalibrationInputs).toEqual({
      magnesium: { dropsInput: '100', weightInput: '5', style: 'round' },
      calcium: { dropsInput: '90', weightInput: '4.5', style: 'straight' },
    });

    saveDiyConcentrateInputs({ ...restored, stockWeightInput: '125' }, false);
    expect(loadDiyConcentrateInputs()).toEqual({
      stockWeightInput: '125',
      lotusCalibrationInputs: {
        magnesium: { dropsInput: '100', weightInput: '5', style: 'round' },
        calcium: { dropsInput: '90', weightInput: '4.5', style: 'straight' },
      },
    });
  });
});