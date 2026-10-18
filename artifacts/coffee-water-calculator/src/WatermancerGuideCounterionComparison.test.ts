import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WatermancerGuideCounterionComparison from './WatermancerGuideCounterionComparison';

describe('Watermancer Guide counterion comparison', () => {
  it('shows a concise explanation and two separate recipe-step images', () => {
    const html = renderToStaticMarkup(createElement(WatermancerGuideCounterionComparison));
    const text = html.replace(/<[^>]*>/g, '');

    expect(text).toContain('Same GH and KH. Different salts.');
    expect(text).toContain('can affect taste');
    expect((html.match(/<img /g) ?? [])).toHaveLength(2);
    expect((html.match(/aria-pressed="false"/g) ?? [])).toHaveLength(2);
    expect(html).not.toContain('role="dialog"');
    expect(html).toContain('alt="Recipe steps image for magnesium chloride');
    expect(html).toContain('alt="Recipe steps image for magnesium sulfate');
    expect(text).toContain('same magnesium, calcium, and bicarbonate targets');
  });

  it('uses the established ion colors for every metric and ion named in the explanation', () => {
    const html = renderToStaticMarkup(createElement(WatermancerGuideCounterionComparison));

    for (const [color, label] of [
      ['#fde047', 'GH'],
      ['#5eead4', 'KH'],
      ['#fde047', 'magnesium'],
      ['#fb923c', 'calcium'],
      ['#5eead4', 'bicarbonate'],
      ['#60a5fa', 'chloride'],
      ['#818cf8', 'sulfate'],
      ['#fb7185', 'sodium'],
      ['#c084fc', 'potassium'],
    ]) {
      expect(html).toContain(`style="color:${color}">${label}</span>`);
    }
  });
});
