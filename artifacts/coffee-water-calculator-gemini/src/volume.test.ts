import { describe, expect, it } from 'vitest';
import {
  litersToVolumeInput,
  US_GALLON_IN_LITERS,
  volumeToLiters,
} from './App';

describe('volume unit conversion', () => {
  it('converts one US gallon to liters', () => {
    expect(volumeToLiters('1', 'gallons')).toBeCloseTo(US_GALLON_IN_LITERS, 10);
  });

  it('round-trips a liter value through the gallon display', () => {
    const liters = 2.5;
    const gallons = litersToVolumeInput(liters, 'gallons');

    expect(volumeToLiters(gallons, 'gallons')).toBeCloseTo(liters, 10);
  });

  it('keeps salt math equivalent after switching the displayed unit', async () => {
    const { computeSaltMg, SALTS } = await import('./waterData');
    const salt = SALTS.find(item => item.id === 'mgso4')!;
    const liters = volumeToLiters('1', 'gallons');
    const fromLiters = computeSaltMg(10, liters, salt.hydrationForms[1].molarMass, salt.anhydrousMass);
    const fromGallons = computeSaltMg(10, volumeToLiters('1', 'gallons'), salt.hydrationForms[1].molarMass, salt.anhydrousMass);

    expect(fromGallons).toBeCloseTo(fromLiters, 10);
  });

  it('rejects negative and non-numeric display values', () => {
    expect(volumeToLiters('-1', 'gallons')).toBe(0);
    expect(volumeToLiters('not-a-volume', 'liters')).toBe(0);
    expect(litersToVolumeInput('-1', 'gallons')).toBe('');
  });
});