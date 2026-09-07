import type { IonId, SaltRecipeEntry } from './waterData';

export type WateringHoleWaterRecipe = {
  id: string;
  name: string;
  salts: Record<string, SaltRecipeEntry>;
  finishedWaterIons: Partial<Record<IonId, number>>;
  finishedWaterMetadata: {
    tds: number;
  };
  source: string;
  notes: string;
};

/**
 * Finished-water recipes imported from HustinJam's .WATER exports.
 * These belong in Watermancer because their final ion readings are more
 * precise targets than the underlying bottled-water source profiles.
 */
export const WATERING_HOLE_WATER_RECIPES: WateringHoleWaterRecipe[] = [
  {
    id: 'hustinjams-gerolsteiner',
    name: "HustinJam's Gerolsteiner",
    salts: {
      mgso4: { target: '5.860171863969424', formIdx: 1 },
      mgcl2: { target: '9.365915563622412', formIdx: 1 },
      nacl: { target: '10.999999999999998', formIdx: 0 },
    },
    finishedWaterIons: {
      sodium: 4.799344284736481,
      potassium: 0.044,
      magnesium: 4.006365633451103,
      calcium: 1.392,
      chloride: 13.807535327267395,
      sulfate: 4.828842182136858,
      bicarbonate: 7.264,
    },
    finishedWaterMetadata: { tds: 36.14208742759184 },
    source: "HustinJam's .WATER recipe export",
    notes: 'Precise final-water readings from the supplied 1 L weighed-salts recipe.',
  },
  {
    id: 'hustinjams-vichy-catalan',
    name: "HustinJam's Vichy Catalan",
    salts: {
      mgso4: { target: '12.20869', formIdx: 1 },
      mgcl2: { target: '19.200121', formIdx: 1 },
    },
    finishedWaterIons: {
      sodium: 5.155900000000001,
      potassium: 0.23970000000000002,
      magnesium: 7.395092084379017,
      calcium: 0.0658,
      chloride: 17.04329880678536,
      sulfate: 9.978420108835625,
      bicarbonate: 9.780700000000001,
    },
    finishedWaterMetadata: { tds: 49.658911 },
    source: "HustinJam's .WATER recipe export",
    notes: 'Precise final-water readings from the supplied 1 L weighed-salts recipe.',
  },
];