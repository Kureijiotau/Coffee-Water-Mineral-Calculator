import { describe, expect, it } from 'vitest';
import { getConcentrateTourSteps } from './concentrateGuidedTour';

describe('getConcentrateTourSteps', () => {
  it('keeps recipe-concentrate guidance on the recipe branch', () => {
    const steps = getConcentrateTourSteps('recipe', true);

    expect(steps.map(step => [step.targetTestId, step.illustrationKey])).toEqual([
      ['concentrate-recipe-overview', 'recipe-concentrate-overview'],
      ['mass-recipe-stock-arrangement', 'recipe-stock-arrangement'],
      ['mass-recipe-stock-weight', 'recipe-stock-weight'],
      ['recipe-dose-result', 'recipe-dose-result'],
      ['mass-recipe-preparation-card', 'recipe-preparation'],
    ]);
    expect(steps.every(step => step.action === undefined)).toBe(true);
  });

  it('explains every recipe stock arrangement in its own step', () => {
    const step = getConcentrateTourSteps('recipe', true).find(
      item => item.targetTestId === 'mass-recipe-stock-arrangement',
    );

    expect(step).toMatchObject({
      title: 'Choose a stock arrangement',
      description: expect.stringContaining('Separate salts'),
    });
    expect(step?.description).toContain('GH + KH');
    expect(step?.description).toContain('All-in-one');
  });

  it('keeps Stock Builder guidance on visible stock sections', () => {
    const steps = getConcentrateTourSteps('stock-builder', false);

    expect(steps.map(step => [step.targetTestId, step.illustrationKey])).toEqual([
      ['mass-stock-composition', 'stock-builder-mineral'],
      ['mass-shared-calibration-fields', 'stock-builder-calibration'],
      ['mass-stock-setup', 'stock-builder-setup'],
      ['mass-stock-dose', 'stock-builder-dose'],
      ['mass-stock-preparation-card', 'stock-builder-preparation'],
    ]);
    expect(steps.every(step => step.action === undefined)).toBe(true);
  });

  it('keeps Lotus Drops guidance on visible Lotus sections', () => {
    const steps = getConcentrateTourSteps('lotus', false);

    expect(steps.map(step => [step.targetTestId, step.illustrationKey])).toEqual([
      ['lotus-dropper-field', 'lotus-dropper'],
      ['mass-shared-calibration-fields', 'lotus-calibration'],
      ['lotus-brew-volume-section', 'lotus-volume'],
      ['lotus-per-drop-summary', 'lotus-per-drop'],
      ['lotus-finished-stock-mass', 'lotus-stock-preparation'],
    ]);
    expect(steps.every(step => step.action === undefined)).toBe(true);
  });

  it('directs an empty recipe workspace back to Calculator', () => {
    const steps = getConcentrateTourSteps('recipe', false);

    expect(steps).toEqual([{
      targetTestId: 'concentrate-empty-state',
      title: 'Start with a recipe',
      description: expect.any(String),
      action: 'calculator',
      illustrationKey: 'recipe-concentrate-empty',
    }]);
  });
});
