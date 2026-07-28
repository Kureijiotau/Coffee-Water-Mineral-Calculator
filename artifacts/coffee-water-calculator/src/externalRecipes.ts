import type { SaltRecipe } from '@/waterData';

export interface ExternalRecipe extends SaltRecipe {
  source: string;
  sourceUrl: string;
  attribution: string;
  method: string;
  notes: string;
  conversion: 'exact' | 'approximation';
}

const sourceUrl = 'https://www.robertasami.com/water';

/**
 * Public recipes transcribed from Robert Asami's Watering Hole.
 *
 * The calculator's salt targets are ppm of the salt itself. Recipes published
 * as grams per liter are therefore converted to mg/L (1 g/L = 1000 ppm).
 * Hydrated forms are selected where the source names them. Recipes containing
 * unspecified spring/sea salt or bottled water are marked as approximations.
 */
export const ROBERT_ASAMI_RECIPES: ExternalRecipe[] = [
  {
    id: 'roberta-aviary-filter',
    name: 'Aviary — Filter',
    salts: {
      mgso4: { target: '81', formIdx: 1 },
      cacl2: { target: '28', formIdx: 0 },
      nahco3: { target: '45', formIdx: 0 },
    },
    source: 'Robert Asami — Watering Hole',
    sourceUrl,
    attribution: 'Recipe credited to Aviary',
    method: 'Filter',
    notes: 'Converted from the published 0.081 g/L Epsom, 0.028 g/L calcium chloride, and 0.045 g/L baking soda recipe.',
    conversion: 'exact',
  },
  {
    id: 'roberta-aviary-espresso',
    name: 'Aviary — Espresso',
    salts: {
      mgso4: { target: '28', formIdx: 1 },
      cacl2: { target: '10', formIdx: 0 },
      nahco3: { target: '100', formIdx: 0 },
    },
    source: 'Robert Asami — Watering Hole',
    sourceUrl,
    attribution: 'Recipe credited to Aviary',
    method: 'Espresso',
    notes: 'Converted from the published 0.028 g/L Epsom, 0.010 g/L calcium chloride, and 0.100 g/L baking soda recipe.',
    conversion: 'exact',
  },
  {
    id: 'roberta-brewman-filter',
    name: 'Brewman — Filter',
    salts: {
      mgso4: { target: '31', formIdx: 1 },
      cacl2: { target: '47', formIdx: 0 },
      nahco3: { target: '67', formIdx: 0 },
    },
    source: 'Robert Asami — Watering Hole',
    sourceUrl,
    attribution: 'Recipe credited to Brewman',
    method: 'Filter',
    notes: 'Converted from the published 0.031 g/L Epsom, 0.047 g/L calcium chloride, and 0.067 g/L baking soda recipe.',
    conversion: 'exact',
  },
  {
    id: 'roberta-brewman-espresso',
    name: 'Brewman — Espresso',
    salts: {
      mgso4: { target: '25', formIdx: 1 },
      cacl2: { target: '44', formIdx: 0 },
      nahco3: { target: '30', formIdx: 0 },
    },
    source: 'Robert Asami — Watering Hole',
    sourceUrl,
    attribution: 'Recipe credited to Brewman',
    method: 'Espresso',
    notes: 'Converted from the published 0.025 g/L Epsom, 0.044 g/L calcium chloride, and 0.030 g/L baking soda recipe.',
    conversion: 'exact',
  },
  {
    id: 'roberta-fam',
    name: 'Fam’s Water',
    salts: {
      mgso4: { target: '152', formIdx: 1 },
      khco3: { target: '46', formIdx: 0 },
    },
    source: 'Robert Asami — Watering Hole',
    sourceUrl,
    attribution: 'Recipe credited to Fam',
    method: 'Espresso',
    notes: 'Converted from the published 0.152 g/L Epsom and 0.046 g/L potassium bicarbonate recipe.',
    conversion: 'exact',
  },
  {
    id: 'roberta-holy-water',
    name: 'Holy Water',
    salts: {
      mgso4: { target: '152', formIdx: 1 },
      khco3: { target: '46', formIdx: 0 },
    },
    source: 'Robert Asami — Watering Hole',
    sourceUrl,
    attribution: 'Recipe credited to StriveForTone',
    method: 'Filter',
    notes: 'Converted from the published 0.152 g/L Epsom and 0.046 g/L potassium bicarbonate recipe.',
    conversion: 'exact',
  },
  {
    id: 'roberta-oslo-tap',
    name: 'Tim Wendelboe — Oslo Tap',
    salts: {
      cacl2: { target: '41', formIdx: 0 },
      nahco3: { target: '47', formIdx: 0 },
    },
    source: 'Robert Asami — Watering Hole',
    sourceUrl,
    attribution: 'Recipe credited to Tim Wendelboe',
    method: 'Filter / tap-water proxy',
    notes: 'The source describes this as a seasonal Oslo tap-water proxy, not a universal distilled-water recipe.',
    conversion: 'approximation',
  },
  {
    id: 'roberta-tww-light',
    name: 'Third Wave Water — Light Roast',
    salts: {
      mgso4: { target: '408', formIdx: 1 },
      nahco3: { target: '30', formIdx: 0 },
    },
    source: 'Robert Asami — Watering Hole',
    sourceUrl,
    attribution: 'Product recipe credited to Third Wave Water',
    method: 'Filter',
    notes: 'Uses the page’s calculator-based Epsom and baking soda breakdown; the commercial packet has a different mineral breakdown.',
    conversion: 'approximation',
  },
  {
    id: 'roberta-tww-espresso',
    name: 'Third Wave Water — Espresso',
    salts: {
      mgso4: { target: '394', formIdx: 1 },
      nahco3: { target: '111', formIdx: 0 },
    },
    source: 'Robert Asami — Watering Hole',
    sourceUrl,
    attribution: 'Product recipe credited to Third Wave Water',
    method: 'Espresso',
    notes: 'Uses the page’s calculator-based Epsom and baking soda breakdown; the commercial packet has a different mineral breakdown.',
    conversion: 'approximation',
  },
  {
    id: 'roberta-terebat',
    name: 'Terebat',
    salts: {
      mgcl2: { target: '40', formIdx: 1 },
      nahco3: { target: '10', formIdx: 0 },
      nacl: { target: '20', formIdx: 0 },
    },
    source: 'Robert Asami — Watering Hole',
    sourceUrl,
    attribution: 'Recipe credited to Terebat',
    method: 'Filter',
    notes: 'The published recipe calls the third ingredient “spring salt”; it is represented here as NaCl as an approximation. Use the source’s preferred spring salt if you have it.',
    conversion: 'approximation',
  },
];