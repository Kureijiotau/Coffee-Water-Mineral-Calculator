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
  ions: IonContribution[];
}

export const IONS: IonInfo[] = [
  { id: 'sodium',      name: 'Sodium',      formula: 'Na⁺',          greenMax: 10, yellowMax: 20 },
  { id: 'potassium',   name: 'Potassium',   formula: 'K⁺',           greenMax: 3,  yellowMax: 5  },
  { id: 'magnesium',   name: 'Magnesium',   formula: 'Mg²⁺',         greenMax: 20, yellowMax: 40 },
  { id: 'calcium',     name: 'Calcium',     formula: 'Ca²⁺',         greenMax: 12, yellowMax: 25 },
  { id: 'chloride',    name: 'Chloride',    formula: 'Cl⁻',          greenMax: 25, yellowMax: 35 },
  { id: 'sulfate',     name: 'Sulfate',     formula: 'SO₄²⁻',        greenMax: 15, yellowMax: 25 },
  { id: 'bicarbonate', name: 'Bicarbonate', formula: 'HCO₃⁻',        greenMax: 20, yellowMax: 35 },
  { id: 'carbonate',   name: 'Carbonate',  formula: 'CO₃²⁻',         greenMax: 5,  yellowMax: 8  },
  { id: 'citrates',    name: 'Citrates',   formula: 'C₆H₅O₇³⁻',      greenMax: 5,  yellowMax: 15 },
  { id: 'bicitrates',  name: 'Bicitrates', formula: 'C₆H₆O₇²⁻',      greenMax: 15, yellowMax: 35 },
  { id: 'biphosphates',name: 'Biphosphates',formula: 'H₂PO₄⁻',       greenMax: 8,  yellowMax: 15 },
  { id: 'phosphates',  name: 'Phosphates', formula: 'PO₄³⁻',          greenMax: 1,  yellowMax: 5  },
];

export const ION_MAP = Object.fromEntries(IONS.map(i => [i.id, i])) as Record<IonId, IonInfo>;

export const SALTS: SaltInfo[] = [
  {
    id: 'mgso4', name: 'Magnesium Sulfate', formula: 'MgSO₄', anhydrousMass: 120.365,
    hydrationForms: [
      { label: 'Anhydrous', molarMass: 120.365 },
      { label: 'Heptahydrate', molarMass: 246.474 },
    ],
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
    ions: [
      { ionId: 'magnesium', fraction: 24.305 / 95.205 },
      { ionId: 'chloride',  fraction: 70.90  / 95.205 },
    ],
  },
  {
    id: 'cacl2', name: 'Calcium Chloride', formula: 'CaCl₂', anhydrousMass: 110.978,
    hydrationForms: [
      { label: 'Anhydrous', molarMass: 110.978 },
      { label: 'Dihydrate', molarMass: 147.008 },
    ],
    ions: [
      { ionId: 'calcium',  fraction: 40.078 / 110.978 },
      { ionId: 'chloride', fraction: 70.90  / 110.978 },
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
  'sodium', 'potassium', 'magnesium', 'calcium', 'chloride', 'sulfate', 'bicarbonate',
];

// CaCO₃ equivalent: 50.04 / equivalent weight of ion
export const CACO3_FACTOR: Partial<Record<IonId, number>> = {
  magnesium: 4.118,
  calcium: 2.497,
  bicarbonate: 0.820,
};

export function classifyIon(ppm: number, ion: IonInfo): TrafficLevel {
  if (ppm < ion.greenMax) return 'green';
  if (ppm <= ion.yellowMax) return 'yellow';
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
