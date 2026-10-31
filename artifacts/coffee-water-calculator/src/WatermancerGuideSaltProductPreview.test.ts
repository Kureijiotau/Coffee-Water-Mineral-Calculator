import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WatermancerGuideSaltProductPreview } from './WatermancerGuideSaltProductPreview';
import { WATERMANCER_GUIDE_SALT_PRODUCTS } from './watermancerGuideSaltProducts';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

describe('Watermancer Guide salt product preview', () => {
  it('connects Zechstein to the uploaded NOW flakes photo as a packaging reference', () => {
    const product = Reflect.get(WATERMANCER_GUIDE_SALT_PRODUCTS, 'zechstein');
    expect(product).toBeDefined();
    expect(product.imageUrl).toBe(`${import.meta.env.BASE_URL}watermancer-guide/now-magnesium-flakes.png`);
    expect(existsSync(join(process.cwd(), 'public/watermancer-guide/now-magnesium-flakes.png'))).toBe(true);
    expect(product.alt).toContain('NOW Solutions');
    expect(product.note).toMatch(/packaging reference only/i);
    expect(product.note).toContain('Use common sense—unscented and additive-free doesn’t automatically mean suitable for drinking water.');
    expect(product.note).not.toMatch(/confirm with the supplier/i);
    const html = renderToStaticMarkup(createElement(WatermancerGuideSaltProductPreview, {
      productId: product.id,
    }));
    expect(html).toContain('Zechstein magnesium chloride flakes');
    expect(html).toContain(`href="${product.imageUrl}"`);
  });

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
