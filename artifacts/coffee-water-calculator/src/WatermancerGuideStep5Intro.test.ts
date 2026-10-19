import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WatermancerGuideStep5Intro from './WatermancerGuideStep5Intro';

describe('Watermancer Guide Step 5 intro', () => {
  it('shows the dropper lineup and makes Watermancer an inline action', () => {
    const html = renderToStaticMarkup(
      createElement(WatermancerGuideStep5Intro, {
        summary: 'With all your 1 mg/drop solutions ready, you can now make very precise water recipes using Watermancer.',
        onOpenWatermancer: () => undefined,
      }),
    );

    expect(html).toContain('With all your ');
    expect(html).toContain('title="0.001 g/drop">1 mg/drop</span>');
    expect(html).toContain('solutions ready, you can now make very precise water recipes using');
    expect(html).toContain('data-testid="guide-step5-dropper-lineup"');
    expect(html).toContain('alt="A row of labeled mineral-salt dropper bottles."');
    expect(html).toContain('data-testid="button-open-watermancer-step5"');
    expect(html).toContain('>Watermancer</button>');
  });
});
