export type VolumeUnit = 'liters' | 'gallons';

export const US_GALLON_IN_LITERS = 3.785411784;

/**
 * Return the canonical liter amount after a unit toggle.
 * A literal 1 L default becomes a one-gallon batch; other volumes retain
 * their physical amount while their displayed unit changes.
 */
export function getLitersAfterVolumeUnitToggle(liters: number, unit: VolumeUnit): number {
  return unit === 'liters' && liters === 1 ? US_GALLON_IN_LITERS : liters;
}
