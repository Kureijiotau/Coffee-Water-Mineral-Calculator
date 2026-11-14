import {
  type CalculatorTourIllustrationKey,
  type ConcentrateTourIllustrationKey,
  type GuidedTourIllustrationKey,
  type WatermancerTourIllustrationKey,
} from './guidedTour';
import { CalculatorTourIllustration } from './CalculatorTourIllustration';
import { ConcentrateTourIllustration } from './ConcentrateTourIllustration';
import { WatermancerTourIllustration } from './WatermancerTourIllustration';

type Props = {
  illustrationKey: GuidedTourIllustrationKey;
};

const watermancerKeys: readonly WatermancerTourIllustrationKey[] = [
  'ion-targets',
  'batch-volume',
  'source-waters',
  'salts',
  'auto-match',
  'final-mixture',
  'recipe-steps',
];

const calculatorKeys: readonly CalculatorTourIllustrationKey[] = [
  'brewer-batch-volume',
  'brewer-mineral-recipe',
  'brewer-salt-summary',
  'brewer-recipe-steps',
  'alchemist-batch-volume',
  'alchemist-mineral-water-base',
  'alchemist-mineral-recipe',
  'alchemist-ion-watch',
  'alchemist-salt-summary',
  'alchemist-recipe-steps',
];

export function GuidedTourIllustration({ illustrationKey }: Props) {
  if ((watermancerKeys as readonly string[]).includes(illustrationKey)) {
    return <WatermancerTourIllustration illustrationKey={illustrationKey as WatermancerTourIllustrationKey} />;
  }
  if ((calculatorKeys as readonly string[]).includes(illustrationKey)) {
    return <CalculatorTourIllustration illustrationKey={illustrationKey as CalculatorTourIllustrationKey} />;
  }
  return <ConcentrateTourIllustration illustrationKey={illustrationKey as ConcentrateTourIllustrationKey} />;
}
