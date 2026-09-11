import {
  createWaterRecipeQrDataUrl,
  WATERMANCER_QR_PREFIX,
} from '../waterRecipeImage';
import {
  encodeWaterRecipeSharePayload,
  type WaterRecipeSharePayload,
} from '../waterRecipeShare';

export const TWO_WATER_RECIPE_CARD_FIXTURE: WaterRecipeSharePayload = {
  kind: 'coffee-water-recipe-share',
  version: 1,
  name: 'Two spring blend',
  liters: '1',
  volumeUnit: 'liters',
  rows: [
    { target: 'mgso4', formIdx: 0 },
    { target: 'mgcl2', formIdx: 1 },
  ],
  mineralWaters: [
    {
      id: 'mixer-source-a',
      name: 'North spring',
      ions: {
        calcium: '18',
        magnesium: '4',
        sodium: '7',
        potassium: '1',
        chloride: '12',
        sulfate: '8',
        bicarbonate: '28',
        citrates: '2',
      },
      metadata: {},
      volumeMl: '640',
    },
  ],
  additionWaters: [
    {
      id: 'mixer-source-b',
      name: 'South spring',
      ions: {
        calcium: '42',
        magnesium: '9',
        sodium: '21',
        potassium: '3',
        chloride: '31',
        sulfate: '17',
        bicarbonate: '64',
        citrates: '5',
      },
      metadata: {},
      volumeMl: '360',
    },
  ],
  finishedIons: {
    calcium: 26.64,
    magnesium: 6.5,
    sodium: 12.04,
    potassium: 1.72,
    chloride: 18.84,
    sulfate: 11.24,
    bicarbonate: 40.96,
    citrates: 3.08,
  },
};

export const TWO_WATER_RECIPE_CARD_SHARE_TOKEN = encodeWaterRecipeSharePayload(
  TWO_WATER_RECIPE_CARD_FIXTURE,
);

export const TWO_WATER_RECIPE_CARD_QR_TEXT = (
  `${WATERMANCER_QR_PREFIX}${TWO_WATER_RECIPE_CARD_SHARE_TOKEN}`
);

export async function createTwoWaterRecipeCardQrPng(): Promise<Uint8Array> {
  const dataUrl = await createWaterRecipeQrDataUrl(TWO_WATER_RECIPE_CARD_SHARE_TOKEN, 640);
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}