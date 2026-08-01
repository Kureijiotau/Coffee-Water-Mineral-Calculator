import type { IonId } from '@/waterData';
import type { WaterMetadata } from '@/localWaters';

export interface ReferenceWater {
  id: string;
  name: string;
  ions: Partial<Record<IonId, number>>;
  metadata: WaterMetadata;
  hardnessAlkalinity: string;
  description: string;
  sourceUrl: string;
}

const SOURCE_URL = 'https://empiricalwater.com/pages/mineral-composition';

/**
 * Published finished-water compositions from Empirical Water's Mineral Profiles
 * page. These are source-water profiles, not salt-dose recipes.
 */
export const EMPIRICAL_WATERS: ReferenceWater[] = [
  {
    id: 'empirical-glacial',
    name: 'Empirical Water — Glacial profile',
    ions: {
      calcium: 9.250,
      magnesium: 2.805,
      sodium: 3.404,
      potassium: 0.600,
      bicarbonate: 29.201,
      chloride: 6.897,
      sulfate: 8.772,
    },
    metadata: { tds: 60.929 },
    hardnessAlkalinity: 'GH/KH ~35/24',
    description: 'Harmonious and lively, with an emphasis on clarity and complexity.',
    sourceUrl: SOURCE_URL,
  },
  {
    id: 'empirical-spring',
    name: 'Empirical Water — Spring profile',
    ions: {
      calcium: 17.491,
      magnesium: 5.241,
      sodium: 0,
      potassium: 0,
      bicarbonate: 27.503,
      chloride: 14.962,
      sulfate: 20.713,
    },
    metadata: { tds: 85.911 },
    hardnessAlkalinity: 'GH/KH ~65/23',
    description: 'Resonant and concentrated, with an emphasis on body and richness.',
    sourceUrl: SOURCE_URL,
  },
  {
    id: 'empirical-aviary',
    name: 'Empirical Water — Aviary Coffee Water',
    ions: {
      calcium: 8.747,
      magnesium: 8.888,
      sodium: 12.416,
      potassium: 0,
      bicarbonate: 32.950,
      chloride: 15.475,
      sulfate: 35.129,
    },
    metadata: { tds: 113.605 },
    hardnessAlkalinity: 'GH/KH ~58/27',
    description: 'Empirical Water’s Aviary Coffee Water mineral profile.',
    sourceUrl: SOURCE_URL,
  },
];