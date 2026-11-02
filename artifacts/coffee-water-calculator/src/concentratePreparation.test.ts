import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { buildConcentratePreparationSteps, ConcentratePreparationSteps, WATER_MASS_NOTE } from './concentratePreparation';

it('shares an ordered, non-retaring preparation sequence and water-only density note', () => {
  const steps = buildConcentratePreparationSteps({ totalStockMassG: 100, waterMassG: 95, saltLabel: '5 g salt' });
  expect(steps.join(' ')).toContain('19–28.5 g');
  expect(steps.join(' ')).toContain('remaining measured water');
  expect(steps.join(' ')).toContain('Do not tare again');
  expect(steps.findIndex(s => s.includes('19–28.5'))).toBeLessThan(steps.findIndex(s => s.includes('Transfer')));
  const html = renderToStaticMarkup(createElement(ConcentratePreparationSteps, { totalStockMassG: 100, waterMassG: 95, saltLabel: '5 g salt' }));
  expect(html).toContain(WATER_MASS_NOTE);
  expect(html).toContain('100 g');
});
