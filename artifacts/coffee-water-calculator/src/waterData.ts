export type IonId =
  | 'sodium' | 'potassium' | 'magnesium' | 'calcium'
  | 'chloride' | 'sulfate' | 'bicarbonate' | 'carbonate'
  | 'citrates' | 'bicitrates' | 'biphosphates' | 'phosphates';

export type TrafficLevel = 'green' | 'yellow' | 'red';

export interface IonInfo {
  id: IonId;
  name: string;
  formula: string;
  greenMax: number;
  yellowMax: number;
  tasteNote: string;
  flagNotes: { green: string; yellow: string; red: string };
}

export interface IonRanges {
  greenMax: number;
  yellowMax: number;
}

export type RangeSet = Record<IonId, IonRanges>;

export interface WaterProfile {
  id: string;
  name: string;
  ranges: RangeSet;
  locked: boolean;
  description?: string;
}

export interface HydrationForm {
  label: string;
  molarMass: number;
}

export interface IonContribution {
  ionId: IonId;
  fraction: number;
}

export type SupplementalIonId = 'lactate';

export interface SupplementalIonInfo {
  id: SupplementalIonId;
  name: string;
  formula: string;
  note: string;
}

export interface SupplementalIonContribution {
  ionId: SupplementalIonId;
  fraction: number;
}

export interface SaltInfo {
  id: string;
  name: string;
  formula: string;
  anhydrousMass: number;
  hydrationForms: HydrationForm[];
  /** Index into hydrationForms selected by default (common commercial form). */
  defaultFormIdx?: number;
  ions: IonContribution[];
  supplementalIons?: SupplementalIonContribution[];
}

export const IONS: IonInfo[] = [
  {
    id: 'sodium', name: 'Sodium', formula: 'Na⁺', greenMax: 10, yellowMax: 20,
    tasteNote: 'Enhances sweetness and body at low levels; excessive sodium makes the cup taste flat, salty, or metallic, and dulls acidity.',
    flagNotes: {
      green: 'Balanced — adds a touch of sweetness and mouthfeel without overpowering other flavors.',
      yellow: 'Elevated — sweetness becomes pronounced but acidity starts to feel muted and the cup may taste slightly flat.',
      red: 'Too high — imparts a salty, metallic off-taste and severely dulls the coffee\'s brightness.',
    },
  },
  {
    id: 'potassium', name: 'Potassium', formula: 'K⁺', greenMax: 3, yellowMax: 5,
    tasteNote: 'Similar to sodium but milder — can add a soft sweetness; too much gives a bitter, soapy, or astringent impression.',
    flagNotes: {
      green: 'Balanced — subtle sweetness with no negative impact on flavor.',
      yellow: 'Elevated — sweetness intensifies but a faint bitterness or astringency may appear in the finish.',
      red: 'Too high — creates a harsh, bitter, soapy character that overwhelms delicate notes.',
    },
  },
  {
    id: 'magnesium', name: 'Magnesium', formula: 'Mg²⁺', greenMax: 20, yellowMax: 40,
    tasteNote: 'Adds structure and clarity to the cup; magnesium-rich water tends to produce a crisp, clean extraction with well-defined flavors.',
    flagNotes: {
      green: 'Balanced — contributes to a clean, crisp cup with well-defined flavor clarity.',
      yellow: 'Elevated — the cup may feel increasingly sharp or dry as structure begins to outweigh sweetness.',
      red: 'Too high — creates an astringent, chalky mouthfeel and an unpleasantly dry finish.',
    },
  },
  {
    id: 'calcium', name: 'Calcium', formula: 'Ca²⁺', greenMax: 12, yellowMax: 25,
    tasteNote: 'Builds body, sweetness, and extraction efficiency; too much calcium makes the cup heavy, dull, and can leave a chalky residue.',
    flagNotes: {
      green: 'Balanced — adds body and sweetness while supporting efficient extraction.',
      yellow: 'Elevated — body becomes heavy and the cup may start to taste dull or thick.',
      red: 'Too high — produces a heavy, chalky cup that masks delicate aromatics and acidity.',
    },
  },
  {
    id: 'chloride', name: 'Chloride', formula: 'Cl⁻', greenMax: 25, yellowMax: 35,
    tasteNote: 'Generally neutral in taste but acts as a counter-ion; high chloride can impart a faint salty or chemical note and may corrode equipment.',
    flagNotes: {
      green: 'Balanced — neutral flavor impact; serves as an unobtrusive counter-ion.',
      yellow: 'Elevated — a faint salty or chemical edge may begin to appear in the background.',
      red: 'Too high — imparts a noticeable salty, medicinal off-taste and accelerates equipment corrosion.',
    },
  },
  {
    id: 'sulfate', name: 'Sulfate', formula: 'SO₄²⁻', greenMax: 15, yellowMax: 25,
    tasteNote: 'Can add a dry, crisp edge to the cup; at high levels sulfate introduces a bitter, astringent, or even medicinal character.',
    flagNotes: {
      green: 'Balanced — adds a clean, dry crispness without bitterness.',
      yellow: 'Elevated — a dry, astringent edge begins to build in the finish.',
      red: 'Too high — creates a bitter, medicinal, or harsh astringency that lingers unpleasantly.',
    },
  },
  {
    id: 'bicarbonate', name: 'Bicarbonate', formula: 'HCO₃⁻', greenMax: 20, yellowMax: 35,
    tasteNote: 'The primary acidity buffer — bicarbonate controls how bright or muted the coffee tastes. Higher levels tame sharp, fruity acidity; too little leaves the cup tasting thin and sour.',
    flagNotes: {
      green: 'Balanced — acidity is well-integrated; bright, fruity notes shine without tasting sour.',
      yellow: 'Elevated — acidity becomes increasingly muted; the cup tastes smoother but may lose vibrancy.',
      red: 'Too high — acidity is heavily suppressed, leaving a flat, dull, or soapy cup with no liveliness.',
    },
  },
  {
    id: 'carbonate', name: 'Carbonate', formula: 'CO₃²⁻', greenMax: 5, yellowMax: 8,
    tasteNote: 'Raises pH strongly and buffers acidity aggressively; even small amounts can make the cup taste flat and soapy.',
    flagNotes: {
      green: 'Balanced — minimal acidity impact at these low levels.',
      yellow: 'Elevated — acidity begins to flatten and the cup may taste soapy or dull.',
      red: 'Too high — severely raises pH, producing a flat, soapy, or bitter cup with no acidity.',
    },
  },
  {
    id: 'citrates', name: 'Citrates', formula: 'C₆H₅O₇³⁻', greenMax: 5, yellowMax: 10,
    tasteNote: 'Adds a bright, citrusy acidity of its own; can enhance fruity and floral notes but too much tastes sour or tart.',
    flagNotes: {
      green: 'Balanced — enhances citrusy, fruity brightness without overwhelming.',
      yellow: 'Elevated — the cup becomes increasingly tart or sour.',
      red: 'Too high — creates an overly sour, lemony character that overwhelms the coffee\'s own flavors.',
    },
  },
  {
    id: 'bicitrates', name: 'Bicitrates', formula: 'C₆H₆O₇²⁻', greenMax: 10, yellowMax: 20,
    tasteNote: 'A milder citrate form (one fewer charge) that contributes gentle acidity and light buffering; noticeable tartness appears sooner than you might expect given its weaker acidity.',
    flagNotes: {
      green: 'Balanced — gentle acidity and soft buffering add a subtle brightness without tartness.',
      yellow: 'Elevated — a mild sour or tart edge begins to build, slightly softening the cup\'s clarity.',
      red: 'Too high — the cup tastes noticeably sour and unbalanced, overwhelming delicate flavors.',
    },
  },
  {
    id: 'biphosphates', name: 'Biphosphates', formula: 'H₂PO₄⁻', greenMax: 8, yellowMax: 15,
    tasteNote: 'Buffers acidity while keeping pH in a favorable range for extraction; can add a clean, crisp character.',
    flagNotes: {
      green: 'Balanced — clean buffering that supports crisp extraction.',
      yellow: 'Elevated — the cup may taste increasingly flat or dull.',
      red: 'Too high — over-buffers acidity, producing a flat or metallic-tasting cup.',
    },
  },
  {
    id: 'phosphates', name: 'Phosphates', formula: 'PO₄³⁻', greenMax: 1, yellowMax: 5,
    tasteNote: 'A strong pH buffer; even small amounts significantly raise pH and mute acidity, making the cup taste flat.',
    flagNotes: {
      green: 'Balanced — minimal buffering at these low levels.',
      yellow: 'Elevated — acidity begins to flatten noticeably.',
      red: 'Too high — heavily over-buffers, producing a flat, dull, or soapy cup.',
    },
  },
];

export const AIKI_DEFAULT_PROFILE: WaterProfile = {
  id: 'aiki-light-roast-pourover',
  name: "Aiki's (Light Roast Pourover)",
  locked: true,
  description: 'Default ranges tuned for lightly roasted pourover coffee by Aiki. Use as a baseline or copy into your own profile.',
  ranges: Object.fromEntries(IONS.map(i => [i.id, { greenMax: i.greenMax, yellowMax: i.yellowMax }])) as RangeSet,
};

export const ION_MAP = Object.fromEntries(IONS.map(i => [i.id, i])) as Record<IonId, IonInfo>;

export const SUPPLEMENTAL_IONS: SupplementalIonInfo[] = [
  {
    id: 'lactate',
    name: 'Lactate',
    formula: 'C₃H₅O₃⁻',
    note: 'Usually subtle at the levels used in coffee water; lactate may contribute a soft, rounded mouthfeel rather than a distinct flavor. At higher levels, a faint tangy or sour edge may appear.',
  },
];

export const SUPPLEMENTAL_ION_MAP = Object.fromEntries(
  SUPPLEMENTAL_IONS.map(ion => [ion.id, ion]),
) as Record<SupplementalIonId, SupplementalIonInfo>;

export const SALTS: SaltInfo[] = [
  {
    id: 'mgso4', name: 'Magnesium Sulfate', formula: 'MgSO₄', anhydrousMass: 120.365,
    hydrationForms: [
      { label: 'Anhydrous', molarMass: 120.365 },
      { label: 'Heptahydrate (Epsom)', molarMass: 246.474 },
    ],
    defaultFormIdx: 1,
    ions: [
      { ionId: 'magnesium', fraction: 24.305 / 120.365 },
      { ionId: 'sulfate',    fraction: 96.06  / 120.365 },
    ],
  },
  {
    id: 'mgcl2', name: 'Magnesium Chloride', formula: 'MgCl₂', anhydrousMass: 95.205,
    hydrationForms: [
      { label: 'Anhydrous', molarMass: 95.205 },
      { label: 'Hexahydrate', molarMass: 203.301 },
    ],
    defaultFormIdx: 1,
    ions: [
      { ionId: 'magnesium', fraction: 24.305 / 95.205 },
      { ionId: 'chloride',  fraction: 70.90  / 95.205 },
    ],
  },
  {
    id: 'mgcit', name: 'Magnesium Citrate', formula: 'Mg₃(C₆H₅O₇)₂', anhydrousMass: 451.114,
    hydrationForms: [
      { label: 'Anhydrous', molarMass: 451.114 },
      { label: 'Nonahydrate', molarMass: 613.251 },
    ],
    defaultFormIdx: 1,
    ions: [
      { ionId: 'magnesium', fraction: (3 * 24.305) / 451.114 },
      { ionId: 'citrates',  fraction: (2 * 189.100) / 451.114 },
    ],
  },
  {
    id: 'cacl2', name: 'Calcium Chloride', formula: 'CaCl₂', anhydrousMass: 110.978,
    hydrationForms: [
      { label: 'Anhydrous (pellets)', molarMass: 110.978 },
      { label: 'Dihydrate', molarMass: 147.008 },
    ],
    defaultFormIdx: 1,
    ions: [
      { ionId: 'calcium',  fraction: 40.078 / 110.978 },
      { ionId: 'chloride', fraction: 70.90  / 110.978 },
    ],
  },
  {
    id: 'calact', name: 'Calcium Lactate', formula: 'Ca(C₃H₅O₃)₂', anhydrousMass: 218.22,
    hydrationForms: [
      { label: 'Anhydrous', molarMass: 218.22 },
      { label: 'Pentahydrate', molarMass: 308.298 },
    ],
    defaultFormIdx: 1,
    ions: [
      { ionId: 'calcium', fraction: 40.078 / 218.22 },
    ],
    supplementalIons: [
      { ionId: 'lactate', fraction: (2 * 89.07) / 218.22 },
    ],
  },
  {
    id: 'cacit', name: 'Calcium Citrate', formula: 'Ca₃(C₆H₅O₇)₂', anhydrousMass: 498.433,
    hydrationForms: [
      { label: 'Anhydrous', molarMass: 498.433 },
      { label: 'Tetrahydrate', molarMass: 570.494 },
    ],
    defaultFormIdx: 1,
    ions: [
      { ionId: 'calcium',  fraction: (3 * 40.078) / 498.433 },
      { ionId: 'citrates', fraction: (2 * 189.100) / 498.433 },
    ],
  },
  {
    id: 'nahco3', name: 'Sodium Bicarbonate', formula: 'NaHCO₃', anhydrousMass: 84.007,
    hydrationForms: [{ label: 'Anhydrous', molarMass: 84.007 }],
    ions: [
      { ionId: 'sodium',     fraction: 22.990 / 84.007 },
      { ionId: 'bicarbonate', fraction: 61.017 / 84.007 },
    ],
  },
  {
    id: 'nacl', name: 'Sodium Chloride', formula: 'NaCl', anhydrousMass: 58.44,
    hydrationForms: [{ label: 'Anhydrous', molarMass: 58.44 }],
    ions: [
      { ionId: 'sodium',   fraction: 22.990 / 58.44 },
      { ionId: 'chloride', fraction: 35.450 / 58.44 },
    ],
  },
  {
    id: 'khco3', name: 'Potassium Bicarbonate', formula: 'KHCO₃', anhydrousMass: 100.115,
    hydrationForms: [{ label: 'Anhydrous', molarMass: 100.115 }],
    ions: [
      { ionId: 'potassium',  fraction: 39.098 / 100.115 },
      { ionId: 'bicarbonate', fraction: 61.017 / 100.115 },
    ],
  },
  {
    id: 'kcl', name: 'Potassium Chloride', formula: 'KCl', anhydrousMass: 74.551,
    hydrationForms: [{ label: 'Anhydrous', molarMass: 74.551 }],
    ions: [
      { ionId: 'potassium', fraction: 39.098 / 74.551 },
      { ionId: 'chloride',  fraction: 35.450 / 74.551 },
    ],
  },
];

export const ACTIVE_ION_IDS: IonId[] = [
  'sodium', 'potassium', 'magnesium', 'calcium', 'chloride', 'sulfate', 'bicarbonate', 'citrates',
];

// CaCO₃ equivalent: 50.04 / equivalent weight of ion
export const CACO3_FACTOR: Partial<Record<IonId, number>> = {
  magnesium: 4.118,
  calcium: 2.497,
  bicarbonate: 0.820,
  carbonate: 1.667,
};

export function classifyIon(ppm: number, ion: IonInfo): TrafficLevel;
export function classifyIon(ppm: number, ranges: IonRanges): TrafficLevel;
export function classifyIon(ppm: number, arg: IonInfo | IonRanges): TrafficLevel {
  const greenMax = 'greenMax' in arg ? arg.greenMax : 0;
  const yellowMax = 'yellowMax' in arg ? arg.yellowMax : 0;
  if (ppm < greenMax) return 'green';
  if (ppm <= yellowMax) return 'yellow';
  return 'red';
}

export function computeSaltMg(
  targetPpm: number, liters: number, hydrationMass: number, anhydrousMass: number,
): number {
  return targetPpm * liters * (hydrationMass / anhydrousMass);
}

export function computeIonTotals(
  saltTargets: Record<string, number>,
  baseIons: Partial<Record<IonId, number>>,
  dilution: number,
): Record<IonId, number> {
  const totals = {} as Record<IonId, number>;
  for (const ion of IONS) totals[ion.id] = 0;
  for (const salt of SALTS) {
    const target = saltTargets[salt.id] || 0;
    for (const c of salt.ions) totals[c.ionId] += target * c.fraction;
  }
  for (const ion of IONS) totals[ion.id] += (baseIons[ion.id] || 0) * dilution;
  return totals;
}

export function computeSupplementalIonTotals(
  saltTargets: Record<string, number>,
): Record<SupplementalIonId, number> {
  const totals = Object.fromEntries(
    SUPPLEMENTAL_IONS.map(ion => [ion.id, 0]),
  ) as Record<SupplementalIonId, number>;

  for (const salt of SALTS) {
    const target = saltTargets[salt.id] || 0;
    for (const contribution of salt.supplementalIons ?? []) {
      totals[contribution.ionId] += target * contribution.fraction;
    }
  }

  return totals;
}

/**
 * Return the sodium-chloride salt target needed to supply a sodium gap.
 * The result is expressed in ppm of NaCl, matching salt target units.
 */
export function computeNaClTargetForSodiumGap(sodiumGap: number): number {
  const sodiumFraction = SALTS
    .find(salt => salt.id === 'nacl')
    ?.ions.find(contribution => contribution.ionId === 'sodium')
    ?.fraction ?? 0;
  return sodiumGap > 0 && sodiumFraction > 0 ? sodiumGap / sodiumFraction : 0;
}

export interface IonOvershoot {
  id: IonId;
  amount: number;
}

/**
 * Find every modeled ion whose final concentration exceeds the original
 * salt-only recipe target. Zero-target ions are intentionally included so
 * unavoidable co-ions such as chloride are still reported.
 */
export function findIonOvershoots(
  actual: Partial<Record<IonId, number>>,
  target: Partial<Record<IonId, number>>,
  tolerance = 0.05,
): IonOvershoot[] {
  return IONS
    .map(({ id }) => ({
      id,
      amount: (actual[id] ?? 0) - (target[id] ?? 0),
    }))
    .filter(item => item.amount > tolerance);
}

/**
 * Find every modeled ion whose final concentration remains below a positive
 * salt-only recipe target. Zero-target ions are not underdosed by definition.
 */
export function findIonUnderdoses(
  actual: Partial<Record<IonId, number>>,
  target: Partial<Record<IonId, number>>,
  tolerance = 0.05,
): IonOvershoot[] {
  return IONS
    .map(({ id }) => ({
      id,
      amount: (target[id] ?? 0) - (actual[id] ?? 0),
    }))
    .filter(item => (target[item.id] ?? 0) > 0 && item.amount > tolerance);
}

export interface SaltRecipeEntry {
  target: string;
  formIdx: number;
}

export interface SaltRecipe {
  id: string;
  name: string;
  salts: Record<string, SaltRecipeEntry>;
  /** Public source metadata for recipes transcribed from external resources. */
  source?: string;
  sourceUrl?: string;
  attribution?: string;
  method?: string;
  notes?: string;
  conversion?: 'exact' | 'approximation';
  /** Split stocks mode — absent/false means off */
  splitMode?: boolean;
  /** Per-group concentrate strengths (×N multiplier); absent means default (100 per group) */
  splitStrengths?: Record<string, number>;
  /** Per-group stock volumes in mL; absent means default ('500' per group) */
  splitMls?: Record<string, string>;
}

export const RECIPES: SaltRecipe[] = [
  {
    id: 'kimoi',
    name: 'Kimoi Water',
    source: 'Kimoi.coffee Resources',
    sourceUrl: 'https://kimoi.coffee/resources',
    attribution: 'Recipe credited to Kimoi.coffee',
    method: 'Water recipe',
    notes: 'Values transcribed from Kimoi.coffee’s public Resources collection and represented using this calculator’s salt-target model.',
    conversion: 'exact',
    salts: {
      mgcl2:  { target: '9.5',  formIdx: 1 },
      mgso4:  { target: '6.0',  formIdx: 1 },
      cacl2:  { target: '11.1', formIdx: 1 },
      nacl:   { target: '10',   formIdx: 0 },
      nahco3: { target: '16.8', formIdx: 0 },
    },
  },
  {
    id: 'terebat',
    name: 'Terebat Water',
    source: 'Kimoi.coffee Resources',
    sourceUrl: 'https://kimoi.coffee/resources',
    attribution: 'Recipe credited to Kimoi.coffee',
    method: 'Water recipe',
    notes: 'Values transcribed from Kimoi.coffee’s public Resources collection and represented using this calculator’s salt-target model.',
    conversion: 'exact',
    salts: {
      mgcl2:  { target: '19.0', formIdx: 1 },
      nacl:   { target: '20',   formIdx: 0 },
      nahco3: { target: '10.1', formIdx: 0 },
    },
  },
];

// ── Concentrate solubility & reaction checks ────────────────

/** Per-salt solubility limit in g/100mL water at ~20°C (anhydrous-equivalent). */
const SALT_SOLUBILITY_G_PER_100ML: Partial<Record<string, number>> = {
  mgso4:  35,
  mgcl2:  54,
  mgcit:  20,
  cacl2:  74.5,
  cacit:  0.085,
  nahco3: 9.6,
  khco3:  33,
  kcl:    34.2,
  nacl:   36,
};

export interface ConcentrateWarning {
  severity: 'error' | 'warning' | 'info';
  /** Display names of the salts involved (so the warning is specific). */
  saltNames: string[];
  /** User-facing message. */
  message: string;
  /** The maximum safe concentrate strength (if computable). */
  maxSafeStrength?: number;
}

/**
 * Check a concentrate recipe for precipitation/solubility risks.
 * @param strength - concentration multiplier (e.g. 50 = ×50)
 * @param saltTargetsBySaltId - map of salt.id → target ppm from the recipe
 * @returns sorted array of warnings (errors first, then severity)
 */
export function checkConcentrate(
  strength: number,
  saltTargetsBySaltId: Record<string, number>,
): ConcentrateWarning[] {
  const warnings: ConcentrateWarning[] = [];

  if (strength <= 1) return warnings;
  if (Object.keys(saltTargetsBySaltId).length === 0) return warnings;

  // ── 1. Per-salt solubility check ─────────────────────────
  for (const salt of SALTS) {
    const target = saltTargetsBySaltId[salt.id] ?? 0;
    if (target <= 0) continue;
    const limit = SALT_SOLUBILITY_G_PER_100ML[salt.id];
    if (limit == null) continue;

    // Anhydrous-equivalent mass of salt per liter of stock (mg/L)
    const perLiterMg = target * strength; // ppm × strength → mg/L in stock
    // Convert to g/100mL  (1 mg/L = 0.0001 g/100mL)
    const gPer100mL = perLiterMg / 10_000;

    if (gPer100mL > limit) {
      // Compute max safe strength from this salt alone
      const maxForSalt = Math.floor((limit * 10_000) / target);
      warnings.push({
        severity: 'error',
        saltNames: [salt.name],
        message: `${salt.name} exceeds its solubility limit at ×${strength} (${gPer100mL.toFixed(2)} g/100mL, limit ~${limit} g/100mL) — max safe: ×${maxForSalt}`,
        maxSafeStrength: maxForSalt,
      });
    }
  }

  // ── 2. Reactive-pair checks (ion concentrations in stock) ──
  // Build a map of ion → total mM in the stock
  const ionMmolInStock: Partial<Record<IonId, number>> = {};
  const saltIonSources: Record<string, string[]> = {}; // ionId → salt names that provide it

  for (const salt of SALTS) {
    const target = saltTargetsBySaltId[salt.id] ?? 0;
    if (target <= 0) continue;
    for (const c of salt.ions) {
      // ppm (mg/L final) × fraction → mg/L of this ion in final
      // × strength → mg/L in stock
      // ÷ molar mass (g/mol) → mmol/L in stock
      const ionInfo = ION_MAP[c.ionId];
      if (!ionInfo) continue;
      // We don't have molar masses for ions readily; approximate ppm mg/L to mmol/L
      // Use approximate molar masses for key ions
      const approxMolarMass: Partial<Record<IonId, number>> = {
        calcium: 40.08,
        magnesium: 24.31,
        sulfate: 96.06,
        carbonate: 60.01,
        citrates: 189.10,
        bicarbonate: 61.02,
      };
      const mw = approxMolarMass[c.ionId];
      if (!mw) continue;
      const mgPerL_Stock = target * strength * c.fraction;
      const mmolL = mgPerL_Stock / mw;
      ionMmolInStock[c.ionId] = (ionMmolInStock[c.ionId] ?? 0) + mmolL;
      if (!saltIonSources[c.ionId]) saltIonSources[c.ionId] = [];
      if (!saltIonSources[c.ionId]!.includes(salt.name)) {
        saltIonSources[c.ionId]!.push(salt.name);
      }
    }
  }

  // Helpers
  const mM = (id: IonId) => ionMmolInStock[id] ?? 0;
  const sources = (id: IonId) => saltIonSources[id] ?? [];

  // Ca²⁺ + SO₄²⁻ → gypsum (CaSO₄), Ksp ≈ 2.4e-5 → ~15 mM
  if (mM('calcium') > 1 && mM('sulfate') > 1) {
    const ca = mM('calcium'), so4 = mM('sulfate');
    const product = ca * so4; // mM² → (mmol/L)²
    // CaSO₄ solubility ~4.9 mM (as Ca or SO₄) in water, ~15 mmol/L total
    // Actually in pure water CaSO₄ solubility is ~15 mM, so [Ca²⁺][SO₄²⁻] limit ≈ 225 mM²
    const limitMmSq = 225; // ~15² for gypsum
    if (product > limitMmSq) {
      const limiting = Math.min(ca, so4);
      const maxStrength = Math.floor(strength * Math.sqrt(limitMmSq / product));
      const names = [...new Set([...sources('calcium'), ...sources('sulfate')])];
      warnings.push({
        severity: 'error',
        saltNames: names,
        message: `${names.join(' + ')} — calcium and sulfate may form gypsum (CaSO₄) at ×${strength}. Max safe: ×${Math.max(maxStrength, 1)}`,
        maxSafeStrength: Math.max(maxStrength, 1),
      });
    }
  }

  // Ca²⁺ + citrate³⁻ → calcium citrate (very low solubility, Ksp ~2.3e-18)
  // Rough: ~0.4 mM limit for Ca in presence of citrate
  if (mM('calcium') > 0.01 && mM('citrates') > 0.01) {
    const ca = mM('calcium'), cit = mM('citrates');
    // Ca₃(Cit)₂ → 3Ca²⁺ + 2Cit³⁻ . Ksp = [Ca]³[Cit]²
    // Very roughly, [Ca] limit ≈ 0.4 mM when [Cit] ≈ 0.4 mM
    // Estimate: Ca * Cit / 200 > 1 means risk
    const risk = (ca * cit) / 200;
    if (risk > 1) {
      const maxStrength = Math.floor(strength / Math.cbrt(risk));
      const names = [...new Set([...sources('calcium'), ...sources('citrates')])];
      warnings.push({
        severity: 'error',
        saltNames: names,
        message: `${names.join(' + ')} — calcium and citrate may form calcium citrate precipitate at ×${strength}. Max safe: ×${Math.max(maxStrength, 1)}`,
        maxSafeStrength: Math.max(maxStrength, 1),
      });
    }
  }

  // Ca²⁺ + CO₃²⁻ → calcite (very low solubility)
  if (mM('calcium') > 0.001 && mM('carbonate') > 0.001) {
    const ca = mM('calcium'), co3 = mM('carbonate');
    if (ca * co3 > 0.04) { // Ksp ~3.3e-9 → ~0.06 mM for each
      const maxStrength = Math.floor(strength * Math.sqrt(0.04 / (ca * co3)));
      const names = [...new Set([...sources('calcium'), ...sources('carbonate')])];
      warnings.push({
        severity: 'error',
        saltNames: names,
        message: `${names.join(' + ')} — calcium and carbonate may form CaCO₃ (calcite) at ×${strength}. Max safe: ×${Math.max(maxStrength, 1)}`,
        maxSafeStrength: Math.max(maxStrength, 1),
      });
    }
  }

  // Mg²⁺ + CO₃²⁻ → MgCO₃
  if (mM('magnesium') > 0.01 && mM('carbonate') > 0.01) {
    const mg = mM('magnesium'), co3 = mM('carbonate');
    if (mg * co3 > 3) { // Ksp ~6.8e-6 → ~2.6 mM
      const maxStrength = Math.floor(strength * Math.sqrt(3 / (mg * co3)));
      const names = [...new Set([...sources('magnesium'), ...sources('carbonate')])];
      warnings.push({
        severity: 'error',
        saltNames: names,
        message: `${names.join(' + ')} — magnesium and carbonate may form MgCO₃ at ×${strength}. Max safe: ×${Math.max(maxStrength, 1)}`,
        maxSafeStrength: Math.max(maxStrength, 1),
      });
    }
  }

  // --- Mg + bicarbonate → high pH risk (Mg(OH)₂)
  if (mM('magnesium') > 0.1 && mM('bicarbonate') > 1) {
    const mg = mM('magnesium'), hco3 = mM('bicarbonate');
    if (hco3 > 10 && mg > 1) {
      const names = [...new Set([...sources('magnesium'), ...sources('bicarbonate')])];
      warnings.push({
        severity: 'warning',
        saltNames: names,
        message: `${names.join(' + ')} — high bicarbonate in a concentrate raises pH and may cause Mg(OH)₂ precipitation. Consider separate alkalinity and hardness stocks.`,
      });
    }
  }

  // ── 3. Measurement precision warning at high × ─────────
  if (strength >= 150) {
    const mLperL = (1000 / strength).toFixed(1);
    const ppmShift = +(0.5 / (1000 / strength) * 100).toFixed(1);
    warnings.push({
      severity: 'info',
      saltNames: [],
      message: `At ×${strength}, each 0.5 mL dosing error shifts targets by ~${ppmShift}%. Consider a lower strength (×50–×100 gives ${(1000 / 50).toFixed(0)}–${(1000 / 100).toFixed(0)} mL/L) for better accuracy.`,
    });
  }

  // ── 4. Total TDS check ──────────────────────────────
  let totalMgPerL = 0;
  for (const salt of SALTS) {
    const target = saltTargetsBySaltId[salt.id] ?? 0;
    if (target <= 0) continue;
    totalMgPerL += target * strength;
  }
  const totalGperL = totalMgPerL / 1000;
  if (totalGperL > 15) {
    warnings.push({
      severity: 'warning',
      saltNames: [],
      message: `Total dissolved solids at ×${strength} (~${totalGperL.toFixed(0)} g/L) — may dissolve slowly or require heat. A weaker stock will mix more readily.`,
    });
  }

  // ── 5. Stock separation recommendation ──────────────
  const hasBicarb = Object.keys(saltTargetsBySaltId).some(id =>
    (id === 'nahco3' || id === 'khco3') && (saltTargetsBySaltId[id] ?? 0) > 0
  );
  const hasCalciumCitrate = (saltTargetsBySaltId['cacit'] ?? 0) > 0;
  const hasOtherCaMg = Object.keys(saltTargetsBySaltId).some(id => {
    if ((saltTargetsBySaltId[id] ?? 0) <= 0) return false;
    if (id === 'cacit' || id === 'nahco3' || id === 'khco3' || id === 'nacl') return false;
    return true;
  });

  if (hasBicarb && hasOtherCaMg) {
    warnings.push({
      severity: 'info',
      saltNames: [],
      message: `For safety, prepare at least 2 separate stocks: combine all Ca/Mg salts (except Calcium Citrate) in one, and Sodium/Potassium Bicarbonate in another. Mix into the final brew water separately.`,
    });
  }
  if (hasCalciumCitrate) {
    const others = Object.keys(saltTargetsBySaltId).filter(id =>
      id !== 'cacit' && (saltTargetsBySaltId[id] ?? 0) > 0
    );
    if (others.length > 0) {
      warnings.push({
        severity: 'info',
        saltNames: ['Calcium Citrate'],
        message: `Calcium Citrate has very low solubility and should be kept as a separate stock from all other salts.`,
      });
    }
  }

  // Sort: errors first, then warnings, then info
  const order = { error: 0, warning: 1, info: 2 };
  warnings.sort((a, b) => order[a.severity] - order[b.severity]);

  return warnings;
}

// ── Stock splitting ──────────────────────────────────────

export interface StockGroup {
  id: 'hardness' | 'alkalinity' | 'citrate';
  name: string;
  saltIds: string[];
  color: 'sky' | 'violet' | 'amber';
}

/**
 * Split active salts into compatible stock groups for safe concentrate mixing.
 * Only returns groups that contain at least one active salt.
 *
 * Groups:
 *   hardness  — Ca/Mg salts without citrate (CaCl₂, MgCl₂, MgSO₄, NaCl, …)
 *   alkalinity — bicarbonate/carbonate salts (NaHCO₃, KHCO₃)
 *   citrate   — citrate-containing salts (Ca citrate, Mg citrate)
 */
export function splitIntoStockGroups(
  saltTargets: Record<string, number>,
): StockGroup[] {
  const ALKALINITY = new Set(['nahco3', 'khco3']);
  const CITRATE    = new Set(['cacit', 'mgcit']);

  const groups: StockGroup[] = [
    { id: 'hardness',   name: 'Hardness Stock',  saltIds: [], color: 'sky' },
    { id: 'alkalinity', name: 'Alkalinity Stock', saltIds: [], color: 'violet' },
    { id: 'citrate',    name: 'Citrate Stock',    saltIds: [], color: 'amber' },
  ];

  for (const salt of SALTS) {
    const target = saltTargets[salt.id] ?? 0;
    if (target <= 0) continue;
    if (ALKALINITY.has(salt.id))   groups[1].saltIds.push(salt.id);
    else if (CITRATE.has(salt.id)) groups[2].saltIds.push(salt.id);
    else                           groups[0].saltIds.push(salt.id);
  }

  return groups.filter(g => g.saltIds.length > 0);
}

export function computeGH(totals: Record<IonId, number>): number {
  return totals.magnesium * (CACO3_FACTOR.magnesium ?? 0)
       + totals.calcium   * (CACO3_FACTOR.calcium ?? 0);
}

export function computeKH(totals: Record<IonId, number>): number {
  return totals.bicarbonate * (CACO3_FACTOR.bicarbonate ?? 0)
       + totals.carbonate * (CACO3_FACTOR.carbonate ?? 0);
}
