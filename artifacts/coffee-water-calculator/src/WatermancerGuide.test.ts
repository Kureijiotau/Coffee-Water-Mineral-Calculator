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

  it('shows the personal starting ranges with the established ion colors', () => {
    const markup = renderGuideSection('WatermancerGuideStartingFramework');
    const text = visibleText(markup);

    expect(text).toContain('12.0–12.5 ppm');
    expect(text).toContain('10 ppm');
    expect(text).toContain('22–25 ppm');
    expect(text).toContain('GH 22–25 ppm CaCO₃');
    expect(text).toContain('KH ~10 ppm CaCO₃');
    expect(text).toContain('0–2.1 ppm');
    expect(text).toContain('4.5–5.5 ppm');
    expect(text).toContain('14–15 ppm');
    expect(text).toContain('1.6–3.4 ppm');
    expect(text).toContain('0.9–1.0 ppm');
    expect(text).toMatch(/one target at a time/i);

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

  it('shows five collapsed one-liter recipe cards and flags the unbalanced label profile', () => {
    const markup = renderGuideSection('WatermancerGuideRecipeCards');
    const text = visibleText(markup);

    expect(markup.match(/<details\b/g)).toHaveLength(5);
    expect(markup).not.toMatch(/<details\b[^>]*\bopen\b/);
    expect(text).toContain('Balanced daily driver');
    expect(text).toContain('zero sulfate');
    expect(text).toMatch(/zero calcium/i);
    expect(text).toContain('High-extraction punch');
    expect(text).toContain('Berain');
    expect(text).toContain('San Pellegrino');
    expect(text).toContain('13 mg');
    expect(text).toContain('13 drops');
    expect(text).toContain('+0.042 meq/L');
    expect(text).toContain('±0.0041 meq/L');
    expect(text).toMatch(/above the usual starting range/i);
    expect(text).toContain('0–7 ppm');
    expect(text).toMatch(/not a charge-balanced target set/i);

    const recipeIonIds: IonId[] = [
      'sodium',
      'potassium',
      'magnesium',
      'calcium',
      'chloride',
      'sulfate',
      'bicarbonate',
    ];
    for (const id of recipeIonIds) {
      expect(markup).toContain(ION_MAP[id].color.foreground);
    }
  });
});
