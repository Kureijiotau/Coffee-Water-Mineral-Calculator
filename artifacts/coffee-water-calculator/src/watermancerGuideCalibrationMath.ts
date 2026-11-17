export type CalibrationRunInput = {
  dropsInput: string;
  weightInput: string;
};

export type ValidCalibrationRun = {
  drops: number;
  weightGrams: number;
  dropsPerMl: number;
};

export type WatermancerCalibrationResult = {
  validRuns: ValidCalibrationRun[];
  totalDrops: number;
  totalWeightGrams: number;
  dropsPerMl: number | null;
  gramsPerDrop: number | null;
  spreadPercent: number | null;
  isValid: boolean;
};

function positiveFiniteNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function calculateWatermancerCalibration(
  runs: CalibrationRunInput[],
): WatermancerCalibrationResult {
  const validRuns = runs.flatMap(({ dropsInput, weightInput }) => {
    const drops = positiveFiniteNumber(dropsInput);
    const weightGrams = positiveFiniteNumber(weightInput);
    if (drops === null || weightGrams === null) return [];
    return [{ drops, weightGrams, dropsPerMl: drops / weightGrams }];
  });
  const totalDrops = validRuns.reduce((total, run) => total + run.drops, 0);
  const totalWeightGrams = validRuns.reduce((total, run) => total + run.weightGrams, 0);
  const hasValidRun = validRuns.length > 0;
  const dropsPerMl = hasValidRun ? totalDrops / totalWeightGrams : null;
  const gramsPerDrop = hasValidRun ? totalWeightGrams / totalDrops : null;
  let spreadPercent: number | null = null;

  if (validRuns.length >= 2) {
    const rates = validRuns.map(run => run.dropsPerMl);
    const meanRate = rates.reduce((total, rate) => total + rate, 0) / rates.length;
    const spread = Math.max(...rates) - Math.min(...rates);
    spreadPercent = (spread / meanRate) * 100;
  }

  return {
    validRuns,
    totalDrops,
    totalWeightGrams,
    dropsPerMl,
    gramsPerDrop,
    spreadPercent,
    isValid: hasValidRun,
  };
}
