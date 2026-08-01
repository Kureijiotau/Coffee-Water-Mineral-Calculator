import { describe, expect, it } from 'vitest';
import { autoFillWaterVolumes, type MineralWaterEntry } from './App';

const water = (
  id: string,
  ions: Partial<Record<string, number>>,
): MineralWaterEntry => ({
  id,
  name: id,
  ions: Object.fromEntries(Object.entries(ions).map(([key, value]) => [key, String(value)])),
  metadata: {},
  volumeMl: '0',
});

describe('autoFillWaterVolumes', () => {
  it('caps every active ion at its safe target in no-recipe mode', () => {
    const entries = [
      water('calcium-rich', { calcium: 12, sulfate: 30 }),
      water('sulfate-rich', { sulfate: 20 }),
    ];

    const filled = autoFillWaterVolumes(
      entries,
      1000,
      { calcium: 10, sulfate: 15 },
      [],
      ['calcium', 'sulfate'],
      50,
      true,
    );

    const calciumRichMl = Number(filled[0].volumeMl);
    const sulfateRichMl = Number(filled[1].volumeMl);
    expect(calciumRichMl * 12 + sulfateRichMl * 0).toBeLessThanOrEqual(10_000);
    expect(calciumRichMl * 30 + sulfateRichMl * 20).toBeLessThanOrEqual(15_000);
  });

  it('does not add variable water when fixed water already exceeds a safe ceiling', () => {
    const fixed = water('fixed', { calcium: 20 });
    fixed.volumeMl = '1000';

    const filled = autoFillWaterVolumes(
      [water('candidate', { calcium: 10 })],
      1000,
      { calcium: 10 },
      [fixed],
      ['calcium'],
      0,
      true,
    );

    expect(filled[0].volumeMl).toBe('0');
  });

  it('keeps recipe-mode deviation behavior unchanged', () => {
    const filled = autoFillWaterVolumes(
      [water('candidate', { calcium: 10 })],
      1000,
      { calcium: 10 },
      [],
      ['calcium'],
      5,
      false,
    );

    expect(filled[0].volumeMl).toBe('1000');
  });
});