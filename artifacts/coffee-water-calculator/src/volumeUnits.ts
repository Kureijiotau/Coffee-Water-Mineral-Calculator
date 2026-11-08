export type VolumeUnit = 'liters' | 'gallons';
export type VolumeInputValues = Record<VolumeUnit, string>;

export const US_GALLON_IN_LITERS = 3.785411784;

export function createVolumeInputValues(litersInput: string | number): VolumeInputValues {
  return { liters: String(litersInput), gallons: '1' };
}

export function updateVolumeInputValue(
  values: VolumeInputValues,
  unit: VolumeUnit,
  value: string,
): VolumeInputValues {
  return { ...values, [unit]: value };
}

export function volumeInputToLiters(value: string | number, unit: VolumeUnit): number {
  const numeric = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return unit === 'gallons' ? numeric * US_GALLON_IN_LITERS : numeric;
}
