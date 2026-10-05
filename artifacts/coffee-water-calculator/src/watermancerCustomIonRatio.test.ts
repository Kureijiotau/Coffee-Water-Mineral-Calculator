import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WatermancerCustomIonRatio } from './WatermancerCustomIonRatio';
import {
  advanceCustomIonRatioPair,
  CUSTOM_ION_RATIO_CYCLE,
  CUSTOM_ION_RATIO_STORAGE_KEY,
  DEFAULT_CUSTOM_ION_RATIO_PAIR,
  formatCustomIonRatio,
  normalizeCustomIonRatioPair,
  loadCustomIonRatioPair,
  parseCustomIonRatioPair,
  saveCustomIonRatioPair,
} from './watermancerCustomIonRatio';

describe('Watermancer custom ion ratio', () => {
  it('starts with sodium relative to potassium', () => {
    expect(DEFAULT_CUSTOM_ION_RATIO_PAIR).toEqual({
      left: 'sodium',
      right: 'potassium',
    });
  });

  it('restores a valid distinct pair from browser storage', () => {
    const stored = JSON.stringify({ left: 'magnesium', right: 'citrates' });
    expect(parseCustomIonRatioPair(stored)).toEqual({
      left: 'magnesium',
      right: 'citrates',
    });
  });

  it('falls back to Na:K for malformed, invalid, or duplicate stored pairs', () => {
    expect(parseCustomIonRatioPair(null)).toEqual(DEFAULT_CUSTOM_ION_RATIO_PAIR);
    expect(parseCustomIonRatioPair('{bad json')).toEqual(DEFAULT_CUSTOM_ION_RATIO_PAIR);
    expect(parseCustomIonRatioPair(JSON.stringify({ left: 'phosphate', right: 'sodium' })))
      .toEqual(DEFAULT_CUSTOM_ION_RATIO_PAIR);
    expect(parseCustomIonRatioPair(JSON.stringify({ left: 'sodium', right: 'sodium' })))
      .toEqual(DEFAULT_CUSTOM_ION_RATIO_PAIR);
  });

  it('round-trips the selected pair through browser storage', () => {
    const entries = new Map<string, string>();
    const storage = {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
    };
    const pair = { left: 'chloride', right: 'potassium' } as const;

    saveCustomIonRatioPair(pair, storage);

    expect(entries.get(CUSTOM_ION_RATIO_STORAGE_KEY)).toBe(JSON.stringify(pair));
    expect(loadCustomIonRatioPair(storage)).toEqual(pair);
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

  it('skips Citrates in the ratio cycle when it is unused', () => {
    let pair = { ...DEFAULT_CUSTOM_ION_RATIO_PAIR };
    for (const expected of ['chloride', 'magnesium', 'calcium', 'sulfate', 'bicarbonate', 'sodium', 'chloride']) {
      pair = advanceCustomIonRatioPair(pair, 'left', false);
      expect(pair.left).toBe(expected);
      expect(pair.left).not.toBe('citrates');
    }
  });

  it('resets a saved Citrates ratio to Na:K when Citrates becomes unused', () => {
    expect(normalizeCustomIonRatioPair({
      left: 'magnesium',
      right: 'citrates',
    }, false)).toEqual(DEFAULT_CUSTOM_ION_RATIO_PAIR);
    expect(advanceCustomIonRatioPair({
      left: 'citrates',
      right: 'sodium',
    }, 'left', false)).toEqual({
      left: 'chloride',
      right: 'potassium',
    });
  });

  it('keeps Citrates available in the ratio when it is used', () => {
    expect(advanceCustomIonRatioPair({
      left: 'bicarbonate',
      right: 'sodium',
    }, 'left', true)).toEqual({
      left: 'citrates',
      right: 'sodium',
    });
    expect(normalizeCustomIonRatioPair({
      left: 'magnesium',
      right: 'citrates',
    }, true)).toEqual({
      left: 'magnesium',
      right: 'citrates',
    });
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