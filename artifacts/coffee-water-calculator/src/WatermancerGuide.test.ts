import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ComponentType } from 'react';
import * as guideView from './WatermancerGuide';
import WatermancerGuide from './WatermancerGuide';
import { ION_MAP, type IonId } from './waterData';

function renderGuideSection(exportName: string): string {
  const Section = Reflect.get(guideView, exportName);
  expect(Section).toBeTypeOf('function');
  return renderToStaticMarkup(createElement(Section as ComponentType));
}

function visibleText(markup: string): string {
  return markup.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&');
}

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

  it('shows the personal ranges, tasting guidance, and strength scaler with the established ion colors', () => {
    const markup = renderGuideSection('WatermancerGuideStartingFramework');
    const text = visibleText(markup);

    expect(text).toContain('11–12.5 ppm');
    expect(text).toContain('KH 9.0–10.3 ppm CaCO₃');
    expect(text).toContain('GH 22+ ppm CaCO₃');
    expect(text).toContain('0–2.1 ppm');
    expect(text).toContain('4.5+ ppm');
    expect(text).toContain('14–15 ppm');
    expect(text).toContain('1.6–3.4 ppm');
    expect(text).toContain('0–1.5 ppm');
    expect(text).toContain('Use the Strength slider in Watermancer to scale up the recipe.');
    expect(text).toContain('It scales every ion target, including bicarbonate (KH), not just GH.');
    expect(text).toContain('In my experience, changes to KH can affect the brew more than changes to GH, so watch the KH reading as you scale.');
    expect(text).toMatch(/Watermancer Strength control/i);
    expect(text).toContain('100% baseline');
    expect(text).toContain('200%');
    expect(text).not.toMatch(/softer tests|one target at a time/i);
    expect(text).toContain('more chloride felt fuller and left a sticky sort of linger on the finish.');
    expect(text).toContain('Sulfate felt faster, cleaner, and crisper, but it hit the dryness wall very quickly.');
    expect(text).toContain('Your palate may respond differently. Taste, contrast, and take notes.');

    const frameworkIonIds: IonId[] = [
      'sodium',
      'potassium',
      'magnesium',
      'calcium',
      'chloride',
      'sulfate',
      'bicarbonate',
    ];
    for (const id of frameworkIonIds) {
      expect(markup).toContain(ION_MAP[id].color.foreground);
    }
  });

  it('replaces the tasting recipes with the full Watermancer workflow', () => {
    const markup = renderGuideSection('WatermancerGuideWorkflow');
    const text = visibleText(markup);

    const sceneHeadings = [
      '1. Choose and manage a recipe',
      '2. Set the plan',
      '3. Add waters',
      '4. Choose salts and match',
      '5. Review and save',
    ];
    const scenePositions = sceneHeadings.map(heading => text.indexOf(heading));
    expect(scenePositions.every(position => position >= 0)).toBe(true);
    expect(scenePositions).toEqual([...scenePositions].sort((a, b) => a - b));

    const requestedActions = [
      'saved profile or a built-in recipe',
      'New',
      'Edit',
      'Save as new',
      'Cancel',
      'Download',
      'Import',
      'Reset',
      'Set your target water',
      'Set final batch volume',
      'all eight ion targets',
      'Add a new water source',
      'My waters',
      'Browse waters',
      'Community waters',
      'Search by water or country',
      'Add to my waters',
      'Added',
      'Share',
      'Share with the community',
      'Use',
      'Not used',
      'hydration form',
      'Guide the match',
      'Water only',
      'Water then salt',
      'Salt only',
      'Optimized',
      'Find the best match',
      'best available partial match',
      'Save Recipe Image',
      '.WATER.png',
    ];
    for (const action of requestedActions) {
      expect(text).toContain(action);
    }

    expect(text).toContain(
      'Reset clears the active waters, salt choices, target inputs, and match results without deleting saved waters, profiles, or preferences.',
    );
    expect(markup).toContain('data-testid="watermancer-guide-screen-community-water"');
    expect(markup).toContain('data-testid="watermancer-guide-screen-share-water"');
    expect(text).toContain(
      'These are screenshots of the actual Watermancer interface. Your saved profiles and values may differ.',
    );
    expect(text).not.toContain('Example screen');
    expect(text).not.toContain('Recipe · Example recipe');
    expect(text).not.toContain('Five 1 L examples from my tastings.');
    expect(text).not.toContain('Balanced daily driver');
    expect(text).not.toContain('High-extraction punch');

    const screenshotFigures = markup.match(/<figure\b[^>]*>[\s\S]*?<\/figure>/g) ?? [];
    const screenshotImages = markup.match(/<img\b[^>]*>/g) ?? [];
    expect(screenshotFigures).toHaveLength(10);
    expect(screenshotImages).toHaveLength(10);
    expect(screenshotFigures.every(figure =>
      /<img\b[^>]*>/.test(figure) &&
      /src="[^"]+\.jpg"/.test(figure) &&
      /\balt="[^"]{10,}"/.test(figure) &&
      /<figcaption\b/.test(figure),
    )).toBe(true);
    expect(screenshotImages.every(image =>
      /src="[^"]*\/watermancer-guide\/[^"]+\.jpg"/.test(image) &&
      /alt="[^"]{10,}"/.test(image),
    )).toBe(true);
    expect(new Set(
      screenshotImages.map(image => image.match(/\bsrc="([^"]+)"/)?.[1]),
    ).size).toBe(10);
    const screenshotBasePath = import.meta.env.BASE_URL;
    for (const image of screenshotImages) {
      const source = image.match(/\bsrc="([^"]+)"/)?.[1] ?? '';
      const publicAssetPath = source.startsWith(screenshotBasePath)
        ? source.slice(screenshotBasePath.length)
        : '';
      expect(publicAssetPath).not.toBe('');
      expect(existsSync(join(process.cwd(), 'public', publicAssetPath))).toBe(true);
    }
    expect(markup.match(/data-testid="watermancer-guide-screen-[^"]+"/g)).toHaveLength(10);
    expect(markup).not.toMatch(/<(?:button|input|select|textarea)\b/i);
    expect(markup).not.toMatch(/role="button"/i);
    expect(markup).toContain('grid-cols-1');
    expect(markup).not.toContain('sm:grid-cols-2');
    expect(markup).toContain('min-w-0');
    expect(markup).not.toMatch(/\b(?:w|min-w)-\[\d+px\]/);

  });
});
