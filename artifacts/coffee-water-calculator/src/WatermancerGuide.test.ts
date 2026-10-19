import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WatermancerGuide from './WatermancerGuide';

describe('Watermancer Guide step layout', () => {
  it('shows the current step title and summary before the ion comparison', () => {
    const html = renderToStaticMarkup(
      createElement(WatermancerGuide, {
        onOpenWatermancer: () => undefined,
      }),
    );
    const headingPosition = html.indexOf('Why taste needs a full profile');
    const summaryPosition = html.indexOf('The same key targets can still produce different-tasting water.');
    const comparisonPosition = html.indexOf('data-testid="guide-counterion-comparison"');

    expect(headingPosition).toBeGreaterThanOrEqual(0);
    expect(summaryPosition).toBeGreaterThanOrEqual(0);
    expect(comparisonPosition).toBeGreaterThanOrEqual(0);
    expect(headingPosition).toBeLessThan(comparisonPosition);
    expect(summaryPosition).toBeLessThan(comparisonPosition);
  });
});
