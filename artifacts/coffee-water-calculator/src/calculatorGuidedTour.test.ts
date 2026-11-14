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
    expect(getCalculatorTourSteps('brewer').map(step => [
      step.targetTestId,
      step.illustrationKey,
    ])).toEqual([
      ['brewer-batch-volume', 'brewer-batch-volume'],
      ['brewer-mineral-recipe', 'brewer-mineral-recipe'],
      ['brewer-salt-summary', 'brewer-salt-summary'],
      ['brewer-recipe-steps', 'brewer-recipe-steps'],
    ]);
  });

  it('includes Alchemist source-water, ion-check, and recipe-step guidance', () => {
    expect(getCalculatorTourSteps('alchemist').map(step => [
      step.targetTestId,
      step.illustrationKey,
    ])).toEqual([
      ['alchemist-batch-volume', 'alchemist-batch-volume'],
      ['alchemist-mineral-water-base', 'alchemist-mineral-water-base'],
      ['alchemist-mineral-recipe', 'alchemist-mineral-recipe'],
      ['alchemist-ion-watch', 'alchemist-ion-watch'],
      ['alchemist-salt-summary', 'alchemist-salt-summary'],
      ['alchemist-recipe-steps', 'alchemist-recipe-steps'],
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
      'watermancer-recipe-steps',
    ]);
    expect(getCalculatorTourSteps('watermancer')[0].description)
      .toContain('add water and salts first');
    expect(getCalculatorTourSteps('watermancer')[0].description)
      .toContain('new profile');
  });

  it('maps all seven Watermancer steps to distinct illustrations only', () => {
    expect(getCalculatorTourSteps('watermancer').map(step => [
      step.targetTestId,
      step.illustrationKey,
    ])).toEqual([
      ['watermancer-ion-targets', 'ion-targets'],
      ['watermancer-batch-volume', 'batch-volume'],
      ['watermancer-water-sources', 'source-waters'],
      ['watermancer-salts', 'salts'],
      ['watermancer-auto-match', 'auto-match'],
      ['watermancer-final-mixture', 'final-mixture'],
      ['watermancer-recipe-steps', 'recipe-steps'],
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

  it('keeps tour state usable when local storage is unavailable', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => { throw new Error('storage unavailable'); },
        setItem: () => { throw new Error('storage unavailable'); },
      },
    });

    expect(hasSeenCalculatorTour('watermancer')).toBe(false);
    expect(() => rememberCalculatorTour('watermancer')).not.toThrow();
  });
});
