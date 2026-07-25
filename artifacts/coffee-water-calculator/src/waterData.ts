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

export interface SaltInfo {
  id: string;
  name: string;
  formula: string;
  anhydrousMass: number;
  hydrationForms: HydrationForm[];
  /** Index into hydrationForms selected by default (common commercial form). */
  defaultFormIdx?: number;
  ions: IonContribution[];
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
    id: 'bicitrates', name: 'Bicitrates', formula: 'C₆H₆O₇²⁻', greenMax: 15, yellowMax: 35,
    tasteNote: 'A milder citrate form that buffers while adding gentle acidity; can round out a cup but excess tastes sour.',
    flagNotes: {
      green: 'Balanced — gentle acidity and buffering work together for a rounded cup.',
      yellow: 'Elevated — a sour or tart note builds in the background.',
      red: 'Too high — the cup tastes sharply sour and unbalanced.',
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
      { label: 'Anhydrous', molarMass: 110.978 },
      { label: 'Dihydrate', molarMass: 147.008 },
    ],
    defaultFormIdx: 1,
    ions: [
      { ionId: 'calcium',  fraction: 40.078 / 110.978 },
      { ionId: 'chloride', fraction: 70.90  / 110.978 },
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
    id: 'khco3', name: 'Potassium Bicarbonate', formula: 'KHCO₃', anhydrousMass: 100.115,
    hydrationForms: [{ label: 'Anhydrous', molarMass: 100.115 }],
    ions: [
      { ionId: 'potassium',  fraction: 39.098 / 100.115 },
      { ionId: 'bicarbonate', fraction: 61.017 / 100.115 },
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
];

export const ACTIVE_ION_IDS: IonId[] = [
  'sodium', 'potassium', 'magnesium', 'calcium', 'chloride', 'sulfate', 'bicarbonate', 'citrates',
];

// CaCO₃ equivalent: 50.04 / equivalent weight of ion
export const CACO3_FACTOR: Partial<Record<IonId, number>> = {
  magnesium: 4.118,
  calcium: 2.497,
  bicarbonate: 0.820,
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

export function computeGH(totals: Record<IonId, number>): number {
  return totals.magnesium * (CACO3_FACTOR.magnesium ?? 0)
       + totals.calcium   * (CACO3_FACTOR.calcium ?? 0);
}

export function computeKH(totals: Record<IonId, number>): number {
  return totals.bicarbonate * (CACO3_FACTOR.bicarbonate ?? 0);
}
