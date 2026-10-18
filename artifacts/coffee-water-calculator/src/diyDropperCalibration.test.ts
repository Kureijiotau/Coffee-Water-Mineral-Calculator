import { describe, expect, it } from 'vitest';

describe('shared DIY dropper calibration', () => {
  it('updates one tip style without replacing other saved DIY settings', async () => {
    const storage = await import('./accountSyncStorage');
    const withCalibration = Reflect.get(storage, 'withDiyLotusCalibration');

    expect(typeof withCalibration).toBe('function');
    if (typeof withCalibration !== 'function') return;

    const existing = {
      stockWeightInput: '125',
      lotusCalibrationInputs: {
        round: { dropsInput: '60', weightInput: '5', style: 'round' },
      },
    };
    expect(withCalibration(
      existing,
      'straight',
      { dropsInput: '100', weightInput: '4', style: 'straight' },
    )).toEqual({
      stockWeightInput: '125',
      lotusCalibrationInputs: {
        round: { dropsInput: '60', weightInput: '5', style: 'round' },
        straight: { dropsInput: '100', weightInput: '4', style: 'straight' },
      },
    });
  });

  it('uses the saved rate for the selected tip style and falls back when it is missing', async () => {
    const lotus = await import('./lotusConcentrate');
    const getDropsPerMl = Reflect.get(lotus, 'getDiyDropperRateForStyle');

    expect(typeof getDropsPerMl).toBe('function');
    if (typeof getDropsPerMl !== 'function') return;

    const calibrations = {
      straight: { dropsInput: '100', weightInput: '4', style: 'straight' },
      round: { dropsInput: '60', weightInput: '5', style: 'round' },
    };
    expect(getDropsPerMl('straight', 20, calibrations)).toBe(25);
    expect(getDropsPerMl('round', 20, calibrations)).toBe(12);
    expect(getDropsPerMl('straight', 20, { round: calibrations.round })).toBe(20);
  });

  it('prefers the matching Guide style, and never reuses an ambiguous manual rate for the other style', async () => {
    const lotus = await import('./lotusConcentrate');
    const resolve = Reflect.get(lotus, 'resolveDiyDropperCalibration');

    expect(typeof resolve).toBe('function');
    if (typeof resolve !== 'function') return;

    const savedStraight = { dropsInput: '100', weightInput: '5', style: 'straight' };
    const oldManual = { dropsInput: '90', weightInput: '5', style: 'straight' };
    expect(resolve('straight', { straight: savedStraight }, oldManual, 20)).toEqual({
      calibration: savedStraight,
      dropsPerMl: 20,
      source: 'guide',
    });
    expect(resolve('round', { straight: savedStraight }, oldManual, 20)).toEqual({
      calibration: null,
      dropsPerMl: lotus.lotusDropsPerMl('round', 20),
      source: 'awaiting-guide',
    });
    expect(resolve('round', {}, { ...oldManual, style: 'round' }, 20)).toEqual({
      calibration: { ...oldManual, style: 'round' },
      dropsPerMl: 18,
      source: 'manual',
    });
  });
});
