export const DEFAULT_WATERMANCER_STRENGTH_PERCENT = 100;
export const MIN_WATERMANCER_STRENGTH_PERCENT = 0;
export const MAX_WATERMANCER_STRENGTH_PERCENT = 200;
export const WATERMANCER_STRENGTH_STEP_PERCENT = 5;

export function normalizeWatermancerStrengthPercent(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_WATERMANCER_STRENGTH_PERCENT;
  }

  const clamped = Math.min(
    MAX_WATERMANCER_STRENGTH_PERCENT,
    Math.max(MIN_WATERMANCER_STRENGTH_PERCENT, value),
  );
  return Math.round(clamped / WATERMANCER_STRENGTH_STEP_PERCENT) * WATERMANCER_STRENGTH_STEP_PERCENT;
}

export function scaleWatermancerTargets<Ion extends string>(
  targets: Partial<Record<Ion, number>>,
  strengthPercent: number,
): Partial<Record<Ion, number>> {
  const multiplier = normalizeWatermancerStrengthPercent(strengthPercent) / 100;
  const scaled: Partial<Record<Ion, number>> = {};

  for (const [ion, value] of Object.entries(targets) as [Ion, number][]) {
    if (Number.isFinite(value) && value >= 0) {
      scaled[ion] = value * multiplier;
    }
  }

  return scaled;
}

export function unscaleWatermancerTargets<Ion extends string>(
  targets: Partial<Record<Ion, number>>,
  strengthPercent: number,
): Partial<Record<Ion, number>> {
  const multiplier = normalizeWatermancerStrengthPercent(strengthPercent) / 100;
  const unscaled: Partial<Record<Ion, number>> = {};

  for (const [ion, value] of Object.entries(targets) as [Ion, number][]) {
    if (Number.isFinite(value) && value >= 0) {
      unscaled[ion] = multiplier > 0 ? value / multiplier : value;
    }
  }

  return unscaled;
}