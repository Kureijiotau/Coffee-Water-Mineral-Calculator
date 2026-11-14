export type WatermancerTourIllustrationKey =
  | 'ion-targets'
  | 'batch-volume'
  | 'source-waters'
  | 'salts'
  | 'auto-match'
  | 'final-mixture'
  | 'recipe-steps';

export type CalculatorTourIllustrationKey =
  | 'brewer-batch-volume'
  | 'brewer-mineral-recipe'
  | 'brewer-salt-summary'
  | 'brewer-recipe-steps'
  | 'alchemist-batch-volume'
  | 'alchemist-mineral-water-base'
  | 'alchemist-mineral-recipe'
  | 'alchemist-ion-watch'
  | 'alchemist-salt-summary'
  | 'alchemist-recipe-steps';

export type ConcentrateTourIllustrationKey =
  | 'recipe-concentrate-empty'
  | 'recipe-concentrate-overview'
  | 'recipe-stock-arrangement'
  | 'recipe-stock-weight'
  | 'recipe-dose-result'
  | 'recipe-preparation'
  | 'stock-builder-mineral'
  | 'stock-builder-calibration'
  | 'stock-builder-setup'
  | 'stock-builder-dose'
  | 'stock-builder-preparation'
  | 'lotus-dropper'
  | 'lotus-calibration'
  | 'lotus-volume'
  | 'lotus-per-drop'
  | 'lotus-stock-preparation';

export type GuidedTourIllustrationKey =
  | WatermancerTourIllustrationKey
  | CalculatorTourIllustrationKey
  | ConcentrateTourIllustrationKey;

export type GuidedTourStep = {
  targetTestId: string;
  title: string;
  description: string;
  action?: 'calculator';
  illustrationKey?: GuidedTourIllustrationKey;
};
