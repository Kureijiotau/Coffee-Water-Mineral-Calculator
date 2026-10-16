import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WatermancerGuideCounterionComparison from './WatermancerGuideCounterionComparison';

describe('Watermancer Guide counterion comparison', () => {
  it('shows a concise explanation and two separate recipe-step images', () => {
    const html = renderToStaticMarkup(createElement(WatermancerGuideCounterionComparison));

    expect(html).toContain('Same GH and KH. Different salts.');
    expect(html).toContain('can affect taste');
    expect((html.match(/<img /g) ?? [])).toHaveLength(2);
    expect(html).toContain('alt="Recipe steps image for magnesium chloride');
    expect(html).toContain('alt="Recipe steps image for magnesium sulfate');
    expect(html).toContain('same magnesium, calcium, and bicarbonate targets');
  });
});
