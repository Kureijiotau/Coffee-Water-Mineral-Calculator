import { describe, expect, it } from 'vitest';
import { EMPIRICAL_WATERS } from './empiricalWaters';

describe('built-in reference waters', () => {
  it('includes the published S.Pellegrino mineral profile', () => {
    const water = EMPIRICAL_WATERS.find(entry => entry.id === 'san-pellegrino');

    expect(water).toBeDefined();
    expect(water?.name).toBe('S.Pellegrino');
    expect(water?.ions).toMatchObject({
      calcium: 169,
      magnesium: 49.2,
      sodium: 31.2,
      potassium: 2.4,
      bicarbonate: 249,
      chloride: 49.8,
      sulfate: 403,
    });
    expect(water?.metadata).toMatchObject({
      silica: 7.2,
      ph: 7.6,
      tds: 860,
    });
    expect(water?.sourceUrl).toBe('https://www.sanpellegrino.com/water/50-cl-glass-bottle');
  });
});