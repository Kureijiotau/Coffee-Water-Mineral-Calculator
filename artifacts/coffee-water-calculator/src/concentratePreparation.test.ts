import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { buildConcentratePreparationSteps, ConcentratePreparationSteps, WATER_MASS_NOTE } from './concentratePreparation';

it('shares the salt-first, one-tare preparation sequence and water-only density note', () => {
  const steps = buildConcentratePreparationSteps({ totalStockMassG: 100, waterMassG: 95, saltLabel: '5 g salt' });
  expect(steps).toHaveLength(6);
  expect(steps[0]).toContain('Place the bottle on the scale and tare it once');
  expect(steps[1]).toContain('Add 5 g salt to the bottle');
  expect(steps[2]).toContain('splash of your measured water');
  expect(steps[2]).toContain('rinse any clinging crystals');
  expect(steps[3]).toContain('total contents weigh 100 g');
  expect(steps[4]).toContain('headspace');
  expect(steps[5]).toContain('shake/mix until the salt dissolves');
  expect(steps.join(' ')).not.toMatch(/20–30%|remaining water|Do not tare again/i);

  const html = renderToStaticMarkup(createElement(ConcentratePreparationSteps, { totalStockMassG: 100, waterMassG: 95, saltLabel: '5 g salt' }));
  expect(html).toContain(WATER_MASS_NOTE);
  expect(html).toContain('100 g');
});
