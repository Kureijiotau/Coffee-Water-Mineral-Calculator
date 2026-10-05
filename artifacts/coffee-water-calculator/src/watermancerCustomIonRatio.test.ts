import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WatermancerCustomIonRatio } from './WatermancerCustomIonRatio';
import {
  advanceCustomIonRatioPair,
  CUSTOM_ION_RATIO_CYCLE,
  DEFAULT_CUSTOM_ION_RATIO_PAIR,
  formatCustomIonRatio,
} from './watermancerCustomIonRatio';

describe('Watermancer custom ion ratio', () => {
  it('starts with sodium relative to potassium', () => {
    expect(DEFAULT_CUSTOM_ION_RATIO_PAIR).toEqual({
      left: 'sodium',
      right: 'potassium',
    });
  });

  it('cycles the left side through the requested sequence without changing the right', () => {
    const chloride = advanceCustomIonRatioPair(DEFAULT_CUSTOM_ION_RATIO_PAIR, 'left');
    const magnesium = advanceCustomIonRatioPair(chloride, 'left');

    expect(chloride).toEqual({ left: 'chloride', right: 'potassium' });
    expect(magnesium).toEqual({ left: 'magnesium', right: 'potassium' });
  });

  it('cycles the right side independently', () => {
    expect(advanceCustomIonRatioPair(DEFAULT_CUSTOM_ION_RATIO_PAIR, 'right'))
      .toEqual({ left: 'sodium', right: 'calcium' });
  });

  it('wraps around and skips the ion selected on the opposite side', () => {
    expect(advanceCustomIonRatioPair({
      left: 'citrates',
      right: 'sodium',
    }, 'left')).toEqual({
      left: 'chloride',
      right: 'sodium',
    });
  });

  it('cycles over all eight core Watermancer ions', () => {
    expect(CUSTOM_ION_RATIO_CYCLE).toEqual([
      'sodium',
      'chloride',
      'magnesium',
      'potassium',
      'calcium',
      'sulfate',
      'bicarbonate',
      'citrates',
    ]);
  });

  it('formats left divided by right as a ratio to one', () => {
    expect(formatCustomIonRatio(3, 2)).toBe('1.5:1');
    expect(formatCustomIonRatio(0, 2)).toBe('0.0:1');
  });

  it('shows an em dash when the right side is zero or the values are invalid', () => {
    expect(formatCustomIonRatio(3, 0)).toBe('—');
    expect(formatCustomIonRatio(3, Number.NaN)).toBe('—');
    expect(formatCustomIonRatio(Number.POSITIVE_INFINITY, 2)).toBe('—');
  });

  it('renders the independent colored pair and its left-to-right ratio', () => {
    const markup = renderToStaticMarkup(createElement(WatermancerCustomIonRatio, {
      pair: DEFAULT_CUSTOM_ION_RATIO_PAIR,
      ionValues: { sodium: 6, potassium: 4 },
      onCycleSide: () => {},
    }));

    expect(markup).toContain('data-pair="sodium:potassium"');
    expect(markup).toContain('Cycle left ion in custom ratio, currently Sodium');
    expect(markup).toContain('Cycle right ion in custom ratio, currently Potassium');
    expect(markup).toContain('1.5:1');
  });
});