export type WatermancerTourIllustrationKey =
  | 'ion-targets'
  | 'batch-volume'
  | 'source-waters'
  | 'salts'
  | 'auto-match'
  | 'final-mixture'
  | 'recipe-steps';

export type GuidedTourStep = {
  targetTestId: string;
  title: string;
  description: string;
  action?: 'calculator';
  illustrationKey?: WatermancerTourIllustrationKey;
};
