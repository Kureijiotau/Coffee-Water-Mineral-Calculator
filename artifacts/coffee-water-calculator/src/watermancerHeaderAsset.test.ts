import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const headerAssetUrl = new URL(
  '../../../attached_assets/watermancer-header-256.webp',
  import.meta.url,
);

describe('Watermancer header image', () => {
  it('uses a small header asset and retains the full-resolution mark for exports', () => {
    expect(appSource).toMatch(
      /import watermancerHeaderImage from '@assets\/watermancer-header-256\.webp';/,
    );
    expect(appSource).toMatch(/src=\{watermancerHeaderImage\}/);
    expect(appSource).toMatch(
      /import watermancerMarkImage from '@assets\/image_1787373159788\.png';/,
    );
    expect(appSource).toMatch(/createWaterRecipePreviewPng\(watermancerMarkImage,/);
    expect(statSync(headerAssetUrl).size).toBeLessThan(128 * 1024);
  });
});
