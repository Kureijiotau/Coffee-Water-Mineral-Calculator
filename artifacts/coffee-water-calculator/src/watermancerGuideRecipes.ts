import type { IonId } from './waterData';

export type WatermancerGuideRecipeId =
  | 'balanced-daily-driver'
  | 'all-chloride-zero-sulfate'
  | 'zero-calcium-brightness'
  | 'high-extraction-punch'
  | 'bottled-water-blend';

export type WatermancerGuideWaterSource =
  | 'ro-distilled'
  | 'magnesium-bicarbonate-base'
  | 'calcium-bicarbonate-base'
  | 'berain'
  | 'san-pellegrino';

export type WatermancerGuideSalt =
  | 'magnesium-sulfate-heptahydrate'
  | 'magnesium-chloride-hexahydrate'
  | 'sodium-chloride'
  | 'potassium-chloride';

export type WatermancerGuideIonId = Extract<
  IonId,
  | 'sodium'
  | 'potassium'
  | 'magnesium'
  | 'calcium'
  | 'chloride'
  | 'sulfate'
  | 'bicarbonate'
>;

export interface WatermancerGuideRecipe {
  readonly id: WatermancerGuideRecipeId;
  readonly water: readonly {
    readonly source: WatermancerGuideWaterSource;
    readonly milliliters: number;
  }[];
  readonly saltDoses: readonly {
    readonly salt: WatermancerGuideSalt;
    readonly milligrams: number;
  }[];
  readonly finalProfile: Readonly<Record<WatermancerGuideIonId, number>>;
  readonly gh: number;
  readonly kh: number;
}

// These retain the user's reported quantities and rounded readings. The
// bottled-water blend is shown with a balance warning rather than adjusted.
export const WATERMANCER_GUIDE_RECIPES = [
  {
    id: 'balanced-daily-driver',
    water: [
      { source: 'ro-distilled', milliliters: 942 },
      { source: 'magnesium-bicarbonate-base', milliliters: 36 },
      { source: 'calcium-bicarbonate-base', milliliters: 22 },
    ],
    saltDoses: [
      { salt: 'magnesium-sulfate-heptahydrate', milligrams: 13 },
      { salt: 'magnesium-chloride-hexahydrate', milligrams: 19 },
      { salt: 'sodium-chloride', milligrams: 4 },
      { salt: 'potassium-chloride', milligrams: 2 },
    ],
    finalProfile: {
      calcium: 1.0,
      magnesium: 5.3,
      sodium: 1.6,
      potassium: 1.0,
      bicarbonate: 12.0,
      chloride: 10.0,
      sulfate: 5.1,
    },
    gh: 24,
    kh: 10,
  },
  {
    id: 'all-chloride-zero-sulfate',
    water: [
      { source: 'ro-distilled', milliliters: 937 },
      { source: 'calcium-bicarbonate-base', milliliters: 30 },
      { source: 'magnesium-bicarbonate-base', milliliters: 33 },
    ],
    saltDoses: [
      { salt: 'magnesium-chloride-hexahydrate', milligrams: 30 },
      { salt: 'sodium-chloride', milligrams: 6 },
      { salt: 'potassium-chloride', milligrams: 2 },
    ],
    finalProfile: {
      calcium: 1.4,
      magnesium: 5.2,
      sodium: 2.4,
      potassium: 1.0,
      bicarbonate: 12.3,
      chloride: 15.1,
      sulfate: 0.0,
    },
    gh: 25,
    kh: 10,
  },
  {
    id: 'zero-calcium-brightness',
    water: [
      { source: 'ro-distilled', milliliters: 950 },
      { source: 'magnesium-bicarbonate-base', milliliters: 50 },
    ],
    saltDoses: [
      { salt: 'magnesium-sulfate-heptahydrate', milligrams: 16 },
      { salt: 'magnesium-chloride-hexahydrate', milligrams: 12 },
      { salt: 'sodium-chloride', milligrams: 5 },
      { salt: 'potassium-chloride', milligrams: 2 },
    ],
    finalProfile: {
      calcium: 0.0,
      magnesium: 5.5,
      sodium: 2.0,
      potassium: 1.0,
      bicarbonate: 12.3,
      chloride: 8.2,
      sulfate: 6.2,
    },
    gh: 22,
    kh: 10,
  },
  {
    id: 'high-extraction-punch',
    water: [
      { source: 'ro-distilled', milliliters: 930 },
      { source: 'calcium-bicarbonate-base', milliliters: 45 },
      { source: 'magnesium-bicarbonate-base', milliliters: 25 },
    ],
    saltDoses: [
      { salt: 'magnesium-sulfate-heptahydrate', milligrams: 13 },
      { salt: 'magnesium-chloride-hexahydrate', milligrams: 30 },
      { salt: 'sodium-chloride', milligrams: 3 },
      { salt: 'potassium-chloride', milligrams: 2 },
    ],
    finalProfile: {
      calcium: 2.1,
      magnesium: 6.1,
      sodium: 1.2,
      potassium: 1.0,
      bicarbonate: 12.5,
      chloride: 13.2,
      sulfate: 5.1,
    },
    gh: 30,
    kh: 10,
  },
  {
    id: 'bottled-water-blend',
    water: [
      { source: 'ro-distilled', milliliters: 815 },
      { source: 'berain', milliliters: 170 },
      { source: 'san-pellegrino', milliliters: 15 },
    ],
    saltDoses: [],
    finalProfile: {
      calcium: 6.2,
      magnesium: 1.3,
      sodium: 3.4,
      potassium: 0.9,
      bicarbonate: 12.1,
      chloride: 6.7,
      sulfate: 7.6,
    },
    gh: 21,
    kh: 10,
  },
] as const satisfies readonly WatermancerGuideRecipe[];
