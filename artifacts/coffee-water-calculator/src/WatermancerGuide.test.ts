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
      'My saved profiles',
      'Recipe · Example recipe',
      'New',
      'Edit',
      'Rename recipe',
      'Save as new',
      'Overwrite selected',
      'Download',
      'Import',
      'Import water profile',
      'Reset',
      'Reset workspace',
      'Set your target water',
      'Final batch volume',
      'Add water source',
      'Browse waters',
      'Community waters',
      'Search water or country…',
      'Add to my waters',
      'Added',
      'Share',
      'Share with the community',
      'Use',
      'Not used',
      'Hydration form',
      'Matching mode',
      'Target values',
      'Ratios',
      'Find the best match',
      'Search your selected waters and salts for the best safe match.',
      'Best match found and applied automatically.',
      'Save Recipe Image',
    ];
    for (const action of requestedActions) {
      expect(text).toContain(action);
    }

    expect(text).toContain(
      'This clears the active waters, salt choices, target inputs, and match results. Saved waters, profiles, and preferences will stay available.',
    );
    expect(markup).toContain('data-testid="watermancer-guide-screen-community-water"');
    expect(markup).toContain('data-testid="watermancer-guide-screen-share-water"');
    expect(text).toContain('Example values are illustrative, not a recommendation.');
    expect(text.match(/Example screen/g)).toHaveLength(10);
    expect(text).not.toContain('Five 1 L examples from my tastings.');
    expect(text).not.toContain('Balanced daily driver');
    expect(text).not.toContain('High-extraction punch');

    const exampleScreens = markup.match(/<figure\b[^>]*>/g) ?? [];
    expect(exampleScreens).toHaveLength(10);
    expect(exampleScreens.every(screen =>
      /role="img"/.test(screen) && /aria-label="[^"]+"/.test(screen),
    )).toBe(true);
    expect(markup.match(/data-testid="watermancer-guide-screen-[^"]+"/g)).toHaveLength(10);
    expect(markup).not.toMatch(/<(?:button|input|select|textarea)\b/i);
    expect(markup).not.toMatch(/role="button"/i);
    expect(markup).toContain('grid-cols-1');
    expect(markup).toContain('sm:grid-cols-2');
    expect(markup).toContain('min-w-0');
    expect(markup).not.toMatch(/\b(?:w|min-w)-\[\d+px\]/);

    const workflowIonIds: IonId[] = [
      'sodium',
      'potassium',
      'magnesium',
      'calcium',
      'chloride',
      'sulfate',
      'bicarbonate',
    ];
    for (const id of workflowIonIds) {
      expect(text).toContain(ION_MAP[id].formula);
    }
  });
});
