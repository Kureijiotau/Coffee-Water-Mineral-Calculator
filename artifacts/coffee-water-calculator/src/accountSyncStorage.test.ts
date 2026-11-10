import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DIY_CONCENTRATE_INPUTS_STORAGE_KEY,
  loadDiyConcentrateInputs,
  loadDiyConcentrateStockState,
  saveDiyConcentrateInputs,
  setAccountSyncScope,
} from './accountSyncStorage';

describe('DIY concentrate input storage', () => {
  const values = new Map<string, string>();
  it('surfaces a malformed saved mass stock and preserves it during other DIY edits', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    const malformed = { version: 2, basis: 'mass', strategy: 'individual', finalLiters: 1,
      groups: [{ id: 'x', totalStockMassG: 100, strength: 20, saltIds: ['unknown'], calibration: null }] };
    values.set(DIY_CONCENTRATE_INPUTS_STORAGE_KEY, JSON.stringify({ massStockPlan: malformed }));
    expect(loadDiyConcentrateStockState()?.kind).toBe('invalid');
    saveDiyConcentrateInputs({ calibrationDropsInput: '100' }, false);
    expect(JSON.parse(values.get(DIY_CONCENTRATE_INPUTS_STORAGE_KEY)!).massStockPlan).toEqual(malformed);
  });
  it.each(['[]', 'null', '"unreadable stock"'])('archives a rejected non-object record %s before another DIY edit', raw => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    values.set(DIY_CONCENTRATE_INPUTS_STORAGE_KEY, raw);
    values.delete(`${DIY_CONCENTRATE_INPUTS_STORAGE_KEY}:recovery`);
    saveDiyConcentrateInputs({ calibrationDropsInput: '100' }, false);
    expect(values.get(`${DIY_CONCENTRATE_INPUTS_STORAGE_KEY}:recovery`)).toBe(raw);
  });
  it('retains a mass plan without overwriting historical input units', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    const massStockPlan = { version: 2 as const, basis: 'mass' as const, strategy: 'individual' as const, finalLiters: 1,
      groups: [{ id: 'mgso4', totalStockMassG: 100, strength: 20, saltIds: ['mgso4'], calibration: null }] };
    saveDiyConcentrateInputs({ stockVolumeInput: '59', massStockPlan }, false);
    expect(loadDiyConcentrateInputs()).toEqual({ stockVolumeInput: '59', massStockPlan });
  });

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

  it('round-trips shared Round and Straight Lotus calibration inputs', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    const inputs = {
      lotusCalibrationInputs: {
        round: { dropsInput: '60', weightInput: '5', style: 'round' as const },
        straight: { dropsInput: '100', weightInput: '4', style: 'straight' as const },
      },
    };

    saveDiyConcentrateInputs(inputs, false);

    expect(loadDiyConcentrateInputs()).toEqual(inputs);
  });

  it('restores and preserves measured drop weights for each Lotus stock', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    const inputs = {
      lotusStockDropMeasurements: {
        magnesium: { dropsInput: '20', weightInput: '1.8' },
        calcium: { dropsInput: '15', weightInput: '1.2' },
        invalid: { dropsInput: 15, weightInput: '1.2' },
      },
    };
    saveDiyConcentrateInputs(inputs, false);

    const restored = loadDiyConcentrateInputs();
    expect(restored).toEqual({
      lotusStockDropMeasurements: {
        magnesium: { dropsInput: '20', weightInput: '1.8' },
        calcium: { dropsInput: '15', weightInput: '1.2' },
      },
    });

    saveDiyConcentrateInputs({ ...restored, stockWeightInput: '125' }, false);
    expect(loadDiyConcentrateInputs()).toEqual({
      stockWeightInput: '125',
      lotusStockDropMeasurements: {
        magnesium: { dropsInput: '20', weightInput: '1.8' },
        calcium: { dropsInput: '15', weightInput: '1.2' },
      },
    });
  });
});