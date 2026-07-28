import type { IonId, SaltRecipe, SaltRecipeEntry } from '@/waterData';

export type RoastLevel = 'light' | 'medium' | 'dark';
export type Process = 'washed' | 'natural' | 'honey' | 'coferment';
export type TasteGoal = 'clarity' | 'sweetness' | 'body' | 'balanced';
export type AcidityGoal = 'bright' | 'round' | 'soft';

export interface TastePreferenceAnswers {
  roaster: string;
  roast: RoastLevel;
  process: Process;
  taste: TasteGoal;
  acidity: AcidityGoal;
  body: 'light' | 'medium' | 'full';
  brewMethod: 'pourover' | 'immersion' | 'espresso';
}

export interface IonProfile {
  sodium: number;
  potassium: number;
  magnesium: number;
  calcium: number;
  chloride: number;
  sulfate: number;
  bicarbonate: number;
  citrates: number;
}

export interface TasteInference {
  title: string;
  summary: string;
  rationale: string[];
  profile: IonProfile;
  recipe: SaltRecipe;
}

const round = (value: number) => Math.round(value * 10) / 10;

export function inferTasteProfile(answers: TastePreferenceAnswers): TasteInference {
  // Aiki's light-roast baseline is the neutral starting point. Each answer nudges
  // a small set of ions instead of producing an opaque "magic" recommendation.
  let profile: IonProfile = {
    sodium: 5, potassium: 0, magnesium: 8, calcium: 18,
    chloride: 18, sulfate: 18, bicarbonate: 35, citrates: 0,
  };

  const rationale: string[] = [
    `Starting from Aiki's light-roast pourover baseline, then tuning for ${answers.roaster || 'your roaster'}.`,
  ];

  if (answers.roast === 'light') {
    profile = { ...profile, magnesium: 8, calcium: 15, chloride: 16, sulfate: 16, bicarbonate: 28 };
    rationale.push('Light roast: keeps GH and KH modest so floral and fruit acidity stays articulate.');
  } else if (answers.roast === 'medium') {
    profile = { ...profile, magnesium: 10, calcium: 28, chloride: 24, sulfate: 20, bicarbonate: 48 };
    rationale.push('Medium roast: adds extraction support and buffer for sweetness and developed flavors.');
  } else {
    profile = { ...profile, magnesium: 6, calcium: 38, chloride: 30, sulfate: 12, bicarbonate: 65 };
    rationale.push('Dark roast: uses more calcium and buffer to build body while softening roast bitterness.');
  }

  if (answers.process === 'washed') {
    profile = { ...profile, sulfate: profile.sulfate + 6, chloride: Math.max(12, profile.chloride - 3), bicarbonate: Math.max(20, profile.bicarbonate - 6) };
    rationale.push('Washed process: leans sulfate-forward with lower buffer for separation and clarity.');
  } else if (answers.process === 'natural') {
    profile = { ...profile, magnesium: profile.magnesium + 4, sulfate: Math.max(10, profile.sulfate - 4), chloride: profile.chloride + 3 };
    rationale.push('Natural process: gives magnesium a little more emphasis to lift fruit and syrupy texture.');
  } else if (answers.process === 'honey') {
    profile = { ...profile, calcium: profile.calcium + 4, chloride: profile.chloride + 2 };
    rationale.push('Honey process: balances sweetness and structure without pushing clarity too hard.');
  } else {
    profile = { ...profile, magnesium: Math.max(4, profile.magnesium - 2), sodium: 3, sulfate: Math.max(10, profile.sulfate - 3) };
    rationale.push('Co-ferment: stays restrained so intense process character is not crowded by the water.');
  }

  if (answers.taste === 'clarity') {
    profile = { ...profile, sulfate: profile.sulfate + 8, chloride: Math.max(10, profile.chloride - 5), calcium: Math.max(10, profile.calcium - 4) };
    rationale.push('Clarity preference: raises the sulfate-to-chloride ratio for a crisp, transparent finish.');
  } else if (answers.taste === 'sweetness') {
    profile = { ...profile, sodium: 8, calcium: profile.calcium + 3, chloride: profile.chloride + 5, sulfate: Math.max(8, profile.sulfate - 3) };
    rationale.push('Sweetness preference: adds a touch of sodium, calcium, and chloride for roundness.');
  } else if (answers.taste === 'body') {
    profile = { ...profile, calcium: profile.calcium + 8, chloride: profile.chloride + 9, sulfate: Math.max(8, profile.sulfate - 5), bicarbonate: profile.bicarbonate + 8 };
    rationale.push('Body preference: shifts toward calcium, chloride, and buffer for a fuller mouthfeel.');
  } else {
    rationale.push('Balanced preference: preserves a middle ground between clarity, sweetness, and body.');
  }

  if (answers.acidity === 'bright') profile = { ...profile, bicarbonate: Math.max(15, profile.bicarbonate - 10), sulfate: profile.sulfate + 4 };
  if (answers.acidity === 'round') profile = { ...profile, bicarbonate: profile.bicarbonate + 4 };
  if (answers.acidity === 'soft') profile = { ...profile, bicarbonate: profile.bicarbonate + 14, sulfate: Math.max(8, profile.sulfate - 4) };

  if (answers.body === 'light') profile = { ...profile, calcium: Math.max(8, profile.calcium - 8), bicarbonate: Math.max(15, profile.bicarbonate - 5) };
  if (answers.body === 'full') profile = { ...profile, calcium: profile.calcium + 8, chloride: profile.chloride + 6 };

  if (answers.brewMethod === 'immersion') profile = { ...profile, calcium: Math.max(8, profile.calcium - 4), bicarbonate: Math.max(15, profile.bicarbonate - 4) };
  if (answers.brewMethod === 'espresso') profile = { ...profile, bicarbonate: profile.bicarbonate + 8, calcium: profile.calcium + 5 };

  profile = Object.fromEntries(
    Object.entries(profile).map(([key, value]) => [key, round(Math.max(0, value))]),
  ) as unknown as IonProfile;

  const sulfateSalt = profile.sulfate / (96.06 / 120.365);
  const magnesiumFromSulfate = sulfateSalt * (24.305 / 120.365);
  const chlorideSalt = Math.max(0, profile.magnesium - magnesiumFromSulfate) / (24.305 / 95.205);
  const calciumSalt = profile.calcium / (40.078 / 110.978);
  const chlorideFromOtherSalts = chlorideSalt * (70.90 / 95.205) + calciumSalt * (70.90 / 110.978);
  const sodiumSalt = Math.max(0, profile.chloride - chlorideFromOtherSalts) / (22.990 / 58.44);
  const bicarbonateSalt = profile.bicarbonate / (61.017 / 84.007);

  const salts: Record<string, SaltRecipeEntry> = {};
  const add = (id: string, value: number, formIdx = 0) => {
    if (value > 0.05) salts[id] = { target: round(value).toString(), formIdx };
  };
  add('mgso4', sulfateSalt, 1);
  add('mgcl2', chlorideSalt, 1);
  add('cacl2', calciumSalt, 1);
  add('nacl', sodiumSalt);
  add('nahco3', bicarbonateSalt);

  const roastLabel = answers.roast === 'light' ? 'Light' : answers.roast === 'medium' ? 'Medium' : 'Dark';
  const processLabel = answers.process === 'coferment' ? 'co-ferment' : answers.process;
  const title = `${roastLabel} roast · ${processLabel} · ${answers.taste} profile`;
  return {
    title,
    summary: `A balanced starting water for ${answers.roaster || 'your coffee'}: ${round(profile.magnesium)} Mg, ${round(profile.calcium)} Ca, ${round(profile.sulfate)} SO₄, ${round(profile.chloride)} Cl, and ${round(profile.bicarbonate)} HCO₃ ppm.`,
    rationale,
    profile,
    recipe: { id: 'taste-match', name: `Taste match — ${title}`, salts },
  };
}

export const TASTE_PROFILE_ION_IDS: IonId[] = [
  'sodium', 'magnesium', 'calcium', 'chloride', 'sulfate', 'bicarbonate',
];