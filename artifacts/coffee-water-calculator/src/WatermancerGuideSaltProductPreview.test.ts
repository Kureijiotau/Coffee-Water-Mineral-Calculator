import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WatermancerGuideSaltProductPreview } from './WatermancerGuideSaltProductPreview';
import { WATERMANCER_GUIDE_SALT_PRODUCTS } from './watermancerGuideSaltProducts';

describe('Watermancer Guide salt product preview', () => {
  it('keeps the product source keyboard-reachable beside the trigger', () => {
    const product = WATERMANCER_GUIDE_SALT_PRODUCTS.nigari;
    const html = renderToStaticMarkup(createElement(WatermancerGuideSaltProductPreview, {
      productId: 'nigari',
    }));

    expect(html).toContain(`href="${product.sourceUrl}"`);
    expect(html).toContain(`Open source for ${product.label}`);
    expect(html).toContain('sr-only');
    expect(html).toContain('focus:not-sr-only');
  });
});
