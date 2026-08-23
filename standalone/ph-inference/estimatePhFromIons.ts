/**
 * Standalone aqueous pH inference.
 *
 * Important: ion concentrations alone do not uniquely determine real-world pH.
 * This module returns a bounded theoretical estimate only when a documented
 * acid/base assumption makes one defensible. It never claims a measured pH.
 */

export type IonName =
  | 'calcium'
  | 'magnesium'
  | 'sodium'
  | 'potassium'
  | 'bicarbonate'
  | 'carbonate'
  | 'sulfate'
  | 'chloride'
  | 'nitrate'
  | 'citrate'
  | 'biphosphate'
  | 'phosphate';

export type WaterIonsPpm = Partial<Record<IonName, number>>;
export type PhMethod =
  | 'phosphate-pair'
  | 'carbonate-pair'
  | 'open-carbonate'
  | 'atmospheric-pure-water'
  | 'underdetermined';

export type PhEstimate = {
  pH: number | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  method: PhMethod;
  warnings: string[];
};

export type PhInferenceOptions = {
  temperatureC?: number;
  /** Used only for open-system carbonate equilibrium. */
  pCO2Atm?: number;
  /** Closed systems cannot infer pH from a lone bicarbonate value. */
  system?: 'open-atmosphere' | 'closed';
};

const MOLAR_MASS: Record<IonName, number> = {
  calcium: 40.078,
  magnesium: 24.305,
  sodium: 22.989,
  potassium: 39.0983,
  bicarbonate: 61.0168,
  carbonate: 60.008,
  sulfate: 96.06,
  chloride: 35.45,
  nitrate: 62.004,
  citrate: 189.10,
  biphosphate: 96.987,
  phosphate: 94.9714,
};

const CHARGE: Record<IonName, number> = {
  calcium: 2,
  magnesium: 2,
  sodium: 1,
  potassium: 1,
  bicarbonate: -1,
  carbonate: -2,
  sulfate: -2,
  chloride: -1,
  nitrate: -1,
  citrate: -3,
  biphosphate: -1,
  phosphate: -3,
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const validPpm = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;

function pKaCarbonicAcid(temperatureC: number): [number, number] {
  // Practical freshwater approximation around room temperature.
  const delta = temperatureC - 25;
  return [6.35 - 0.012 * delta, 10.33 - 0.010 * delta];
}

function pKaPhosphate(temperatureC: number): number {
  return 7.20 - 0.015 * (temperatureC - 25);
}

function ionicStrength(ions: WaterIonsPpm): number {
  return (Object.keys(CHARGE) as IonName[]).reduce((sum, ion) => {
    const molarity = validPpm(ions[ion]) / MOLAR_MASS[ion] / 1000;
    return sum + 0.5 * molarity * CHARGE[ion] ** 2;
  }, 0);
}

function activityCoefficient(charge: number, strength: number): number {
  if (charge === 0 || strength <= 0) return 1;
  const sqrtStrength = Math.sqrt(strength);
  const logGamma = -0.509 * charge ** 2
    * (sqrtStrength / (1 + sqrtStrength) - 0.3 * strength);
  return 10 ** logGamma;
}

function hendersonHasselbalch(
  acidMolarity: number,
  baseMolarity: number,
  pKa: number,
  acidCharge: number,
  baseCharge: number,
  strength: number,
): number {
  const acidActivity = acidMolarity * activityCoefficient(acidCharge, strength);
  const baseActivity = baseMolarity * activityCoefficient(baseCharge, strength);
  return pKa + Math.log10(baseActivity / acidActivity);
}

function result(
  pH: number,
  confidence: PhEstimate['confidence'],
  method: PhMethod,
  warnings: string[],
): PhEstimate {
  return { pH: clamp(pH, 0, 14), confidence, method, warnings };
}

/**
 * Infer theoretical pH from ppm ion values under explicit assumptions.
 *
 * Direct conjugate-pair estimates are the strongest result this input shape
 * can support. A lone bicarbonate value uses an open-atmosphere assumption.
 * The function returns no number for buffered/closed water without enough
 * acid-base information.
 */
export function estimatePhFromIons(
  ions: WaterIonsPpm,
  options: PhInferenceOptions = {},
): PhEstimate {
  const temperatureC = options.temperatureC ?? 25;
  const pCO2Atm = options.pCO2Atm ?? 0.000412;
  const system = options.system ?? 'open-atmosphere';
  const warnings: string[] = [];

  if (!Number.isFinite(temperatureC) || temperatureC < 0 || temperatureC > 100) {
    return {
      pH: null,
      confidence: 'none',
      method: 'underdetermined',
      warnings: ['Temperature must be between 0°C and 100°C.'],
    };
  }
  if (!Number.isFinite(pCO2Atm) || pCO2Atm <= 0) {
    return {
      pH: null,
      confidence: 'none',
      method: 'underdetermined',
      warnings: ['pCO₂ must be a positive atmospheric pressure in atm.'],
    };
  }

  const strength = ionicStrength(ions);
  if (strength > 0.1) {
    warnings.push('Ionic strength is above 0.1 M; the Davies activity correction is outside its comfortable range.');
  } else if (strength > 0.01) {
    warnings.push('Activity corrections are approximate at this ionic strength.');
  }
  warnings.push('This is a theoretical estimate, not a substitute for a calibrated pH measurement.');

  const bicarbonate = validPpm(ions.bicarbonate) / MOLAR_MASS.bicarbonate / 1000;
  const carbonate = validPpm(ions.carbonate) / MOLAR_MASS.carbonate / 1000;
  const biphosphate = validPpm(ions.biphosphate) / MOLAR_MASS.biphosphate / 1000;
  const phosphate = validPpm(ions.phosphate) / MOLAR_MASS.phosphate / 1000;
  const [pKaCarbonic, pKaBicarbonate] = pKaCarbonicAcid(temperatureC);

  if (biphosphate > 1e-9 && phosphate > 1e-9) {
    warnings.push('Phosphate is interpreted as HPO₄²⁻ and biphosphate as H₂PO₄⁻.');
    return result(
      hendersonHasselbalch(biphosphate, phosphate, pKaPhosphate(temperatureC), -1, -2, strength),
      'high',
      'phosphate-pair',
      warnings,
    );
  }

  if (bicarbonate > 1e-9 && carbonate > 1e-9) {
    return result(
      hendersonHasselbalch(bicarbonate, carbonate, pKaBicarbonate, -1, -2, strength),
      'high',
      'carbonate-pair',
      warnings,
    );
  }

  if (system === 'open-atmosphere' && bicarbonate > 1e-9) {
    const dissolvedCO2 = 10 ** -1.5 * pCO2Atm;
    const pH = pKaCarbonic
      + Math.log10((bicarbonate * activityCoefficient(-1, strength)) / dissolvedCO2);
    warnings.push(`Assumes an open system equilibrated with ${Math.round(pCO2Atm * 1_000_000)} ppm atmospheric CO₂.`);
    warnings.push('A closed vessel, degassing, acid addition, or unmeasured alkalinity can move the real pH substantially.');
    return result(pH, 'medium', 'open-carbonate', warnings);
  }

  if (
    system === 'open-atmosphere'
    && strength < 1e-6
    && bicarbonate === 0
    && carbonate === 0
    && biphosphate === 0
    && phosphate === 0
  ) {
    warnings.push('Assumes pure water equilibrated with atmospheric CO₂.');
    return result(5.65, 'low', 'atmospheric-pure-water', warnings);
  }

  warnings.push('The supplied ions do not define a unique acid-base state.');
  warnings.push('Provide measured pH, alkalinity, or complete acid/base conjugate pairs instead of treating charge imbalance as hydrogen ion.');
  return { pH: null, confidence: 'none', method: 'underdetermined', warnings };
}