import type { GuidedTourStep } from './guidedTour';

export type CalculatorTourMode = 'brewer' | 'alchemist' | 'watermancer';

const TOUR_STORAGE_KEYS: Record<CalculatorTourMode, string> = {
  brewer: 'watermancer.brewer-tour.v1',
  alchemist: 'watermancer.alchemist-tour.v1',
  watermancer: 'watermancer.watermancer-tour.v1',
};

const BREWER_STEPS: GuidedTourStep[] = [
  {
    targetTestId: 'brewer-batch-volume',
    title: 'Set your batch volume',
    description: 'Choose how much finished water you’re making. The recipe doses are calculated for this amount.',
    illustrationKey: 'brewer-batch-volume',
  },
  {
    targetTestId: 'brewer-mineral-recipe',
    title: 'Build the mineral recipe',
    description: 'Set each mineral target here. Brewer groups GH and KH contributors and updates the direct salt amounts in milligrams.',
    illustrationKey: 'brewer-mineral-recipe',
  },
  {
    targetTestId: 'brewer-salt-summary',
    title: 'Check the recipe summary',
    description: 'GH, KH, TDS, and their ratio give you a quick check of the salt recipe.',
    illustrationKey: 'brewer-salt-summary',
  },
  {
    targetTestId: 'brewer-recipe-steps',
    title: 'Follow the dosing steps',
    description: 'Open the checklist to weigh salts or dose calibrated concentrate into RO or distilled water.',
    illustrationKey: 'brewer-recipe-steps',
  },
];

const ALCHEMIST_STEPS: GuidedTourStep[] = [
  {
    targetTestId: 'alchemist-batch-volume',
    title: 'Set your batch volume',
    description: 'Choose the final amount you want to make. Salt targets and direct doses use this batch size.',
    illustrationKey: 'alchemist-batch-volume',
  },
  {
    targetTestId: 'alchemist-mineral-water-base',
    title: 'Add mineral water if needed',
    description: 'This optional, collapsed section lets you count bottled or mineral water toward the finished recipe.',
    illustrationKey: 'alchemist-mineral-water-base',
  },
  {
    targetTestId: 'alchemist-mineral-recipe',
    title: 'Create or choose a recipe',
    description: 'Choose, save, share, or import a mineral recipe. Adjust salt targets and hydration forms, or send it to Concentrates.',
    illustrationKey: 'alchemist-mineral-recipe',
  },
  {
    targetTestId: 'alchemist-ion-watch',
    title: 'Review the ion check',
    description: 'Aiki’s check shows whether modeled ions are within the selected profile’s ranges. It does not change your recipe.',
    illustrationKey: 'alchemist-ion-watch',
  },
  {
    targetTestId: 'alchemist-salt-summary',
    title: 'Review the salt-only summary',
    description: 'This shows GH, KH, and TDS from salts. Mineral-water contributions are accounted for separately.',
    illustrationKey: 'alchemist-salt-summary',
  },
  {
    targetTestId: 'alchemist-recipe-steps',
    title: 'Open Recipe steps',
    description: 'Review the preparation instructions for this recipe, then save the steps as an image if you want.',
    illustrationKey: 'alchemist-recipe-steps',
  },
];

const WATERMANCER_STEPS: GuidedTourStep[] = [
  {
    targetTestId: 'watermancer-ion-targets',
    title: 'Choose your ion targets',
    description: 'Start with a saved profile or set ion goals directly. You can also work backwards: add water and salts first, then save these ion targets in a new profile.',
    illustrationKey: 'ion-targets',
  },
  {
    targetTestId: 'watermancer-batch-volume',
    title: 'Set your finished volume',
    description: 'Choose how much water you want to make. Water amounts and salt doses are based on this batch size.',
    illustrationKey: 'batch-volume',
  },
  {
    targetTestId: 'watermancer-water-sources',
    title: 'Add source waters',
    description: 'Optionally add bottled or mineral water. Its modeled ions count toward your final targets.',
    illustrationKey: 'source-waters',
  },
  {
    targetTestId: 'watermancer-salts',
    title: 'Choose salts and doses',
    description: 'Select which salts Watermancer may use. Editing a dose holds it fixed while the match adjusts the other selected salts.',
    illustrationKey: 'salts',
  },
  {
    targetTestId: 'watermancer-auto-match',
    title: 'Run Precision Auto-match',
    description: 'Use Find the best match to apply the best available salt and water plan for your selected targets.',
    illustrationKey: 'auto-match',
  },
  {
    targetTestId: 'watermancer-final-mixture',
    title: 'Review the final mixture',
    description: 'Compare the modeled final ions and summary with your target profile before preparing the water.',
    illustrationKey: 'final-mixture',
  },
  {
    targetTestId: 'watermancer-recipe-steps',
    title: 'Open Recipe steps',
    description: 'Review the water and salt amounts for the current plan, along with its preparation steps.',
    illustrationKey: 'recipe-steps',
  },
];

export function getCalculatorTourSteps(mode: CalculatorTourMode): GuidedTourStep[] {
  if (mode === 'brewer') return BREWER_STEPS;
  if (mode === 'alchemist') return ALCHEMIST_STEPS;
  return WATERMANCER_STEPS;
}

export function getCalculatorTourLabel(mode: CalculatorTourMode): string {
  return mode === 'brewer' ? 'Brewer' : mode === 'alchemist' ? 'Alchemist' : 'Watermancer';
}

export function hasSeenCalculatorTour(mode: CalculatorTourMode): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(TOUR_STORAGE_KEYS[mode]) === 'seen';
  } catch {
    return false;
  }
}

export function rememberCalculatorTour(mode: CalculatorTourMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEYS[mode], 'seen');
  } catch {
    // Keep the tour usable when local storage is unavailable.
  }
}
