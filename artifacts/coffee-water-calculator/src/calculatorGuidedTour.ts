import type { GuidedTourStep } from './guidedTour';

export type CalculatorTourMode = 'brewer' | 'alchemist';

const TOUR_STORAGE_KEYS: Record<CalculatorTourMode, string> = {
  brewer: 'watermancer.brewer-tour.v1',
  alchemist: 'watermancer.alchemist-tour.v1',
};

const BREWER_STEPS: GuidedTourStep[] = [
  {
    targetTestId: 'brewer-batch-volume',
    title: 'Set your batch volume',
    description: 'Choose how much finished water you’re making. The recipe doses are calculated for this amount.',
  },
  {
    targetTestId: 'brewer-mineral-recipe',
    title: 'Build the mineral recipe',
    description: 'Set each mineral target here. Brewer groups GH and KH contributors and updates the direct salt amounts in milligrams.',
  },
  {
    targetTestId: 'brewer-salt-summary',
    title: 'Check the recipe summary',
    description: 'GH, KH, TDS, and their ratio give you a quick check of the salt recipe.',
  },
  {
    targetTestId: 'brewer-recipe-steps',
    title: 'Follow the dosing steps',
    description: 'Open the checklist to weigh salts or dose calibrated concentrate into RO or distilled water.',
  },
];

const ALCHEMIST_STEPS: GuidedTourStep[] = [
  {
    targetTestId: 'alchemist-batch-volume',
    title: 'Set your batch volume',
    description: 'Choose the final amount you want to make. Salt targets and direct doses use this batch size.',
  },
  {
    targetTestId: 'alchemist-mineral-water-base',
    title: 'Add mineral water if needed',
    description: 'This optional, collapsed section lets you count bottled or mineral water toward the finished recipe.',
  },
  {
    targetTestId: 'alchemist-mineral-recipe',
    title: 'Create or choose a recipe',
    description: 'Choose, save, share, or import a mineral recipe. Adjust salt targets and hydration forms, or send it to Concentrates.',
  },
  {
    targetTestId: 'alchemist-ion-watch',
    title: 'Review the ion check',
    description: 'Aiki’s check shows whether modeled ions are within the selected profile’s ranges. It does not change your recipe.',
  },
  {
    targetTestId: 'alchemist-salt-summary',
    title: 'Review the salt-only summary',
    description: 'This shows GH, KH, and TDS from salts. Mineral-water contributions are accounted for separately.',
  },
];

export function getCalculatorTourSteps(mode: CalculatorTourMode): GuidedTourStep[] {
  return mode === 'brewer' ? BREWER_STEPS : ALCHEMIST_STEPS;
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
