import { describe, expect, it } from 'vitest';
import { calculateWatermancerCalibration } from './watermancerGuideCalibrationMath';

describe('calculateWatermancerCalibration', () => {
  it('returns combined rates for one run', () => {
    const result = calculateWatermancerCalibration([
      { dropsInput: '50', weightInput: '2' },
    ]);

    expect(result).toMatchObject({
      totalDrops: 50,
      totalWeightGrams: 2,
      dropsPerMl: 25,
      gramsPerDrop: 0.04,
      spreadPercent: null,
      isValid: true,
    });
  });

  it('combines three valid runs', () => {
    const result = calculateWatermancerCalibration([
      { dropsInput: '50', weightInput: '2' },
      { dropsInput: '100', weightInput: '4' },
      { dropsInput: '100', weightInput: '4' },
    ]);

    expect(result).toMatchObject({
      totalDrops: 250,
      totalWeightGrams: 10,
      dropsPerMl: 25,
      gramsPerDrop: 0.04,
      spreadPercent: 0,
      isValid: true,
    });
  });

  it('ignores blank, zero, negative, and incomplete runs', () => {
    const result = calculateWatermancerCalibration([
      { dropsInput: '50', weightInput: '2' },
      { dropsInput: '', weightInput: '' },
      { dropsInput: '0', weightInput: '2' },
      { dropsInput: '30', weightInput: '-1' },
      { dropsInput: '20', weightInput: '' },
    ]);

    expect(result.validRuns).toHaveLength(1);
    expect(result.totalDrops).toBe(50);
    expect(result.totalWeightGrams).toBe(2);
    expect(result.spreadPercent).toBeNull();
  });

  it('reports no valid result when all runs are empty or invalid', () => {
    const result = calculateWatermancerCalibration([
      { dropsInput: '', weightInput: '' },
      { dropsInput: '0', weightInput: '0' },
    ]);

    expect(result).toMatchObject({
      validRuns: [],
      totalDrops: 0,
      totalWeightGrams: 0,
      dropsPerMl: null,
      gramsPerDrop: null,
      spreadPercent: null,
      isValid: false,
    });
  });

  it('computes spread at exactly five percent', () => {
    const result = calculateWatermancerCalibration([
      { dropsInput: '205', weightInput: '2' },
      { dropsInput: '195', weightInput: '2' },
    ]);

    expect(result.spreadPercent).toBeCloseTo(5, 10);
  });

  it('computes spread just above five percent', () => {
    const result = calculateWatermancerCalibration([
      { dropsInput: '205.2', weightInput: '2' },
      { dropsInput: '195', weightInput: '2' },
    ]);

    expect(result.spreadPercent).toBeGreaterThan(5);
  });
});
