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

  it('remembers first visits independently for Brewer and Alchemist', () => {
    expect(hasSeenCalculatorTour('brewer')).toBe(false);
    expect(hasSeenCalculatorTour('alchemist')).toBe(false);

    rememberCalculatorTour('brewer');

    expect(hasSeenCalculatorTour('brewer')).toBe(true);
    expect(hasSeenCalculatorTour('alchemist')).toBe(false);
  });
});
