import { describe, expect, it } from 'vitest';
import {
  WORKFRAME_DEFAULT_DRAFT,
  workframeConstraints,
  workframeMetrics,
  workframeTargetsFromDraft,
} from './workframe';

describe('workframe profile conversion', () => {
  it('converts the relationship-first draft into all active ion targets', () => {
    const targets = workframeTargetsFromDraft(WORKFRAME_DEFAULT_DRAFT);

    expect(targets).toMatchObject({
      calcium: 52,
      magnesium: 26,
      bicarbonate: 104,
      sulfate: 58,
      chloride: 42,
      potassium: 8,
      sodium: 76,
      citrates: 0,
    });
  });

  it('keeps relationship anchors available as diagnostics', () => {
    expect(workframeMetrics(WORKFRAME_DEFAULT_DRAFT)).toEqual({
      ghKh: expect.closeTo(5.6 / 1.7, 8),
      mgCa: 0.5,
      kNa: 9.5,
      anions: 100,
      alkali: 84,
    });
  });

  it('marks the default profile as clear and flags invalid caps', () => {
    expect(workframeConstraints(WORKFRAME_DEFAULT_DRAFT)).toEqual({
      ghKh: true,
      mgCa: true,
      anions: true,
      alkali: true,
      bicarbonate: true,
    });

    expect(workframeConstraints({
      ...WORKFRAME_DEFAULT_DRAFT,
      sulfate: 90,
      chloride: 50,
      potassium: 12,
      sodium: 80,
    })).toMatchObject({
      anions: false,
      alkali: false,
    });
  });
});