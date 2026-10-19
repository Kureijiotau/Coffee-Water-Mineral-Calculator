import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MilligramTooltip, { MilligramTooltipText, formatMilligramsAsGrams } from './MilligramTooltip';

describe('milligram-to-gram tooltips', () => {
  it('shows a gram equivalent without changing the displayed mass', () => {
    const html = renderToStaticMarkup(
      createElement(MilligramTooltip, { amountMg: 250 }, '250 mg'),
    );

    expect(html).toContain('title="0.25 g"');
    expect(html).toContain('>250 mg</span>');
  });

  it('formats small and whole-gram values without losing precision', () => {
    expect(formatMilligramsAsGrams(0.125)).toBe('0.000125 g');
    expect(formatMilligramsAsGrams(1000)).toBe('1 g');
  });

  it('adds tooltips to text mass values, including mg per drop, but not concentrations', () => {
    const html = renderToStaticMarkup(
      createElement(MilligramTooltipText, {
        text: '1 mg/drop · 25 mg · 3 mg/L · 2 mg/mL',
      }),
    );

    expect(html).toContain('title="0.001 g/drop">1 mg/drop</span>');
    expect(html).toContain('title="0.025 g">25 mg</span>');
    expect(html).toContain('3 mg/L');
    expect(html).toContain('2 mg/mL');
    expect(html).not.toContain('title="0.003 g"');
    expect(html).not.toContain('title="0.002 g"');
  });
});
