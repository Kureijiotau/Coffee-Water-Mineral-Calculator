export type ConcentrateTourBranch = 'recipe' | 'stock-builder' | 'lotus';

import type { GuidedTourStep } from './guidedTour';

export type ConcentrateTourStep = GuidedTourStep;

export const CONCENTRATE_TOUR_STORAGE_KEY = 'watermancer.concentrates-tour.v1';

export function hasSeenConcentrateTour(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CONCENTRATE_TOUR_STORAGE_KEY) === 'seen';
  } catch {
    return false;
  }
}

export function rememberConcentrateTour(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONCENTRATE_TOUR_STORAGE_KEY, 'seen');
  } catch {
    // Private browsing settings can disable local storage; keep the tour usable.
  }
}

const RECIPE_STEPS: ConcentrateTourStep[] = [
  {
    targetTestId: 'concentrate-recipe-overview',
    title: 'Your recipe',
    description: 'This recipe came from Calculator. Set the brewing-water amount and review its stock plan here.',
    illustrationKey: 'recipe-concentrate-overview',
  },
  {
    targetTestId: 'mass-recipe-stock-arrangement',
    title: 'Choose a stock arrangement',
    description: [
      'Separate salts — one stock per active salt; more control, more bottles.',
      'GH + KH — compatible salts are grouped into hardness, alkalinity, and citrate stocks. Only groups used by this recipe appear.',
      'All-in-one — all active salts share one stock, keeping recipe proportions together for simpler dosing; safe strength may be lower.',
    ].join('\n'),
    illustrationKey: 'recipe-stock-arrangement',
  },
  {
    targetTestId: 'mass-recipe-stock-weight',
    title: 'Set stock size',
    description: 'Each card shows one stock. Set its finished mass and recipe strength; the stock mass includes salt and water, not the bottle.',
    illustrationKey: 'recipe-stock-weight',
  },
  {
    targetTestId: 'recipe-dose-result',
    title: 'Dose for your brew',
    description: 'This is the stock mass to add for the selected water amount. Drop counts use calibration when available and are labeled when estimated.',
    illustrationKey: 'recipe-dose-result',
  },
  {
    targetTestId: 'mass-recipe-preparation-card',
    title: 'Prepare the stock',
    description: 'Use Recipe steps for the exact salt and water weights. Tare the bottle, add the salt, then water to the target mass, leaving room to shake.',
    illustrationKey: 'recipe-preparation',
  },
];

const STOCK_BUILDER_STEPS: ConcentrateTourStep[] = [
  {
    targetTestId: 'mass-stock-composition',
    title: 'Choose a mineral',
    description: 'Select one salt and its hydration form. The form changes the amount to weigh.',
    illustrationKey: 'stock-builder-mineral',
  },
  {
    targetTestId: 'mass-shared-calibration-fields',
    title: 'Calibrate the dropper',
    description: 'Measure plain-water drops for each tip style. The selected style is used for the dose estimate.',
    illustrationKey: 'stock-builder-calibration',
  },
  {
    targetTestId: 'mass-stock-setup',
    title: 'Set stock and brew size',
    description: 'Choose the finished concentrate weight and the amount of brewing water this stock should treat.',
    illustrationKey: 'stock-builder-setup',
  },
  {
    targetTestId: 'mass-stock-dose',
    title: 'Choose the dose target',
    description: 'Set a per-drop target in CaCO₃-equivalent ppm or physical salt mg/L. Stock strength and preparation update automatically as you change it.',
    illustrationKey: 'stock-builder-dose',
  },
  {
    targetTestId: 'mass-stock-preparation-card',
    title: 'Follow the preparation',
    description: 'Tare the bottle, add the salt, then add water to the finished target weight. Leave headspace so you can shake it.',
    illustrationKey: 'stock-builder-preparation',
  },
];

const LOTUS_STEPS: ConcentrateTourStep[] = [
  {
    targetTestId: 'lotus-dropper-field',
    title: 'Choose a dropper',
    description: 'Pick the mineral stock you want to prepare. Its salt and hydration form are shown beside the selector.',
    illustrationKey: 'lotus-dropper',
  },
  {
    targetTestId: 'mass-shared-calibration-fields',
    title: 'Calibrate this tip',
    description: 'Measure plain-water drops for this selected tip. Calibrate the other style separately if you use it.',
    illustrationKey: 'lotus-calibration',
  },
  {
    targetTestId: 'lotus-brew-volume-section',
    title: 'Set brewing-water volume',
    description: 'Choose the amount of brewing water. The ppm contribution per drop updates with this volume.',
    illustrationKey: 'lotus-volume',
  },
  {
    targetTestId: 'lotus-per-drop-summary',
    title: 'Read the per-drop amount',
    description: 'Compare the Lotus reference with your calibrated estimate to see how much of this ion each drop adds.',
    illustrationKey: 'lotus-per-drop',
  },
  {
    targetTestId: 'lotus-finished-stock-mass',
    title: 'Prepare your stock',
    description: 'After calibrating the tip, enter the finished stock mass. The panel calculates salt and water weights and shows preparation steps.',
    illustrationKey: 'lotus-stock-preparation',
  },
];

export function getConcentrateTourSteps(
  branch: ConcentrateTourBranch,
  hasRecipeHandoff: boolean,
): ConcentrateTourStep[] {
  if (branch === 'recipe' && !hasRecipeHandoff) {
    return [{
      targetTestId: 'concentrate-empty-state',
      title: 'Start with a recipe',
      description: 'Choose a recipe in Calculator, then open its concentrate plan to see the stock weights and dose.',
      action: 'calculator',
      illustrationKey: 'recipe-concentrate-empty',
    }];
  }

  if (branch === 'recipe') return RECIPE_STEPS;
  if (branch === 'stock-builder') return STOCK_BUILDER_STEPS;
  return LOTUS_STEPS;
}
