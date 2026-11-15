import {
  SALTS,
  computeGH,
  computeIonTotals,
  computeKH,
  computeSaltMg,
  type IonId,
} from './waterData';

export type SaltUnitsInput = {
  saltTargets: Record<string, number>;
  formIndexBySaltId: Record<string, number>;
  liters: number;
};

export type SaltUnitsContribution = {
  saltId: string;
  saltName: string;
  targetPpm: number;
  weighedMassMg: number;
  ionPpm: Partial<Record<IonId, number>>;
  ghCaCo3Ppm: number;
  khCaCo3Ppm: number;
};

export type SaltUnitsBreakdown = {
  available: boolean;
  contributions: SaltUnitsContribution[];
  totalGhCaCo3Ppm: number;
  totalKhCaCo3Ppm: number;
  totalTdsMgL: number;
};

function emptyBreakdown(): SaltUnitsBreakdown {
  return {
    available: false,
    contributions: [],
    totalGhCaCo3Ppm: 0,
    totalKhCaCo3Ppm: 0,
    totalTdsMgL: 0,
  };
}

export function calculateSaltUnitsBreakdown(input: SaltUnitsInput): SaltUnitsBreakdown {
  if (!Number.isFinite(input.liters) || input.liters <= 0) return emptyBreakdown();

  const contributions: SaltUnitsContribution[] = [];
  let totalGhCaCo3Ppm = 0;
  let totalKhCaCo3Ppm = 0;
  let totalTdsMgL = 0;

  for (const salt of SALTS) {
    const targetPpm = input.saltTargets[salt.id];
    if (!Number.isFinite(targetPpm) || targetPpm <= 0) continue;

    const formIndex = input.formIndexBySaltId[salt.id];
    const selectedForm = Number.isInteger(formIndex) && formIndex >= 0
      ? salt.hydrationForms[formIndex]
      : undefined;
    const hydrationForm = selectedForm
      ?? salt.hydrationForms[salt.defaultFormIdx ?? 0]
      ?? salt.hydrationForms[0];

    if (!hydrationForm) continue;

    const ionTotals = computeIonTotals({ [salt.id]: targetPpm }, {}, 1);
    const ionPpm = Object.fromEntries(
      Object.entries(ionTotals).filter(([, ppm]) => ppm !== 0),
    ) as Partial<Record<IonId, number>>;
    const ghCaCo3Ppm = computeGH(ionTotals);
    const khCaCo3Ppm = computeKH(ionTotals);
    const tdsMgL = Object.values(ionTotals).reduce((total, ppm) => total + ppm, 0);

    contributions.push({
      saltId: salt.id,
      saltName: salt.name,
      targetPpm,
      weighedMassMg: computeSaltMg(
        targetPpm,
        input.liters,
        hydrationForm.molarMass,
        salt.anhydrousMass,
      ),
      ionPpm,
      ghCaCo3Ppm,
      khCaCo3Ppm,
    });
    totalGhCaCo3Ppm += ghCaCo3Ppm;
    totalKhCaCo3Ppm += khCaCo3Ppm;
    totalTdsMgL += tdsMgL;
  }

  if (contributions.length === 0) return emptyBreakdown();

  return {
    available: true,
    contributions,
    totalGhCaCo3Ppm,
    totalKhCaCo3Ppm,
    totalTdsMgL,
  };
}
