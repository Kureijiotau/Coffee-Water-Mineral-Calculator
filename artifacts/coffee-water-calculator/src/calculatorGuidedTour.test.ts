import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCalculatorTourSteps,
  hasSeenCalculatorTour,
  rememberCalculatorTour,
} from './calculatorGuidedTour';

const storedValues = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storedValues.get(key) ?? null,
  setItem: (key: string, value: string) => { storedValues.set(key, value); },
};

beforeEach(() => {
  storedValues.clear();
  vi.stubGlobal('window', { localStorage: localStorageMock });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('calculator guided tours', () => {
  it('keeps Brewer guidance focused on its recipe workflow', () => {
    expect(getCalculatorTourSteps('brewer').map(step => step.targetTestId)).toEqual([
      'brewer-batch-volume',
      'brewer-mineral-recipe',
      'brewer-salt-summary',
      'brewer-recipe-steps',
    ]);
  });

  it('includes Alchemist source-water and ion-check guidance', () => {
    expect(getCalculatorTourSteps('alchemist').map(step => step.targetTestId)).toEqual([
      'alchemist-batch-volume',
      'alchemist-mineral-water-base',
      'alchemist-mineral-recipe',
      'alchemist-ion-watch',
      'alchemist-salt-summary',
    ]);
  });

  it('covers the Watermancer target-to-result workflow', () => {
    expect(getCalculatorTourSteps('watermancer').map(step => step.targetTestId)).toEqual([
      'watermancer-ion-targets',
      'watermancer-batch-volume',
      'watermancer-water-sources',
      'watermancer-salts',
      'watermancer-auto-match',
      'watermancer-final-mixture',
    ]);
  });

  it('remembers first visits independently for all calculator modes', () => {
    expect(hasSeenCalculatorTour('brewer')).toBe(false);
    expect(hasSeenCalculatorTour('alchemist')).toBe(false);
    expect(hasSeenCalculatorTour('watermancer')).toBe(false);

    rememberCalculatorTour('brewer');
    rememberCalculatorTour('watermancer');

    expect(hasSeenCalculatorTour('brewer')).toBe(true);
    expect(hasSeenCalculatorTour('alchemist')).toBe(false);
    expect(hasSeenCalculatorTour('watermancer')).toBe(true);
  });
});
