import { describe, expect, it } from 'vitest';
import { rankGeminiWatermancerCandidates, scoreGeminiWatermancerCandidate } from './watermancerGeminiSolver';
import type { WatermancerRouteCandidate } from './watermancerPlan';
import type { IonId } from './waterData';

const route = (ions: Partial<Record<IonId, number>>, target: Partial<Record<IonId, number>> = {}, saltTargets: Record<string, number> = {}): WatermancerRouteCandidate => ({
  id: `r-${Object.values(ions).join('-') || 'empty'}`, kind: 'primary', label: 'test', explanation: '',
  plan: {
    targetIons: target, selectedWaters: [], selectedSalts: Object.keys(saltTargets), fixedWaterVolumes: {}, fixedSaltDoses: {},
    strategy: 'closest-match', saltObjective: 'balanced', ionPriority: ['bicarbonate'], allowOvershoot: false,
    allowedOvershootIons: [], overshootLimits: {}, overshootOrder: ['bicarbonate'],
  },
  baseWaters: [], additionWaters: [], saltTargets, finalIons: Object.fromEntries(
    ['sodium', 'potassium', 'magnesium', 'calcium', 'chloride', 'sulfate', 'bicarbonate', 'carbonate', 'citrates', 'bicitrates', 'biphosphates', 'phosphates']
      .map(id => [id, ions[id as IonId] ?? 0]),
  ) as Record<IonId, number>,
  deviations: [], overshoots: [], score: 0,
});

describe('isolated Gemini Watermancer chemistry lane', () => {
  it('couples bicarbonate and sodium for NaHCO3', () => expect(scoreGeminiWatermancerCandidate(route({ sodium: 20, bicarbonate: 30 }, { bicarbonate: 30 }, { nahco3: 10 }))).toBeGreaterThan(scoreGeminiWatermancerCandidate(route({ sodium: 0, bicarbonate: 30 }, { bicarbonate: 30 })))); 
  it('charges sodium even when bicarbonate is useful', () => expect(scoreGeminiWatermancerCandidate(route({ sodium: 25, bicarbonate: 30 }, { bicarbonate: 30 }, { nahco3: 10 }))).toBeGreaterThan(0));
  it('prefers material bicarbonate coverage', () => expect(scoreGeminiWatermancerCandidate(route({ bicarbonate: 20 }, { bicarbonate: 30 }))).toBeLessThan(scoreGeminiWatermancerCandidate(route({ bicarbonate: 0 }, { bicarbonate: 30 }))));
  it('penalizes sulfate above the sensory range', () => expect(scoreGeminiWatermancerCandidate(route({ sulfate: 30 }))).toBeGreaterThan(scoreGeminiWatermancerCandidate(route({ sulfate: 10 }))));
  it('penalizes sulfate harshness more than equal chloride distance', () => expect(scoreGeminiWatermancerCandidate(route({ sulfate: 30 }))).toBeGreaterThan(scoreGeminiWatermancerCandidate(route({ chloride: 30 }))));
  it('retains chloride tradeoff in scoring', () => expect(scoreGeminiWatermancerCandidate(route({ chloride: 40 }))).toBeGreaterThan(scoreGeminiWatermancerCandidate(route({ chloride: 5 }))));
  it('reports zero-target chloride as a real cost', () => expect(scoreGeminiWatermancerCandidate(route({ chloride: 8 }))).toBeGreaterThan(0));
  it('reports zero-target sulfate as a real cost', () => expect(scoreGeminiWatermancerCandidate(route({ sulfate: 8 }))).toBeGreaterThan(0));
  it('does not punish omitted optional salts', () => {
    const omitted = route({}, { magnesium: 1 }, { mgso4: 0 });
    const forced = route({}, { magnesium: 1 }, { mgso4: 1 });
    const policy = { practicalMinimumDosePpm: { mgso4: 10 } };
    expect(scoreGeminiWatermancerCandidate(omitted, policy)).toBeLessThan(scoreGeminiWatermancerCandidate(forced, policy));
  });
  it('penalizes a dose below a practical minimum', () => expect(scoreGeminiWatermancerCandidate(route({ magnesium: 1 }, { magnesium: 10 }, { mgso4: 1 }), { practicalMinimumDosePpm: { mgso4: 10 } })).toBeGreaterThan(1000));
  it('favors a fixed dose over an otherwise identical optional dose', () => {
    const a = route({ calcium: 10 }, { calcium: 10 }, { cacl2: 10 });
    const b = { ...a, id: 'optional', plan: { ...a.plan, fixedSaltDoses: {} } };
    a.plan.fixedSaltDoses = { cacl2: 10 };
    expect(scoreGeminiWatermancerCandidate(a)).toBeLessThan(scoreGeminiWatermancerCandidate(b));
  });
  it('accepts source preference configuration', () => expect(scoreGeminiWatermancerCandidate(route({ magnesium: 5 }, { magnesium: 10 }), { sourcePreferences: { magnesium: 'water-only' } })).toBeGreaterThan(0));
  it('keeps empirical water-like profiles competitive', () => expect(scoreGeminiWatermancerCandidate(route({ calcium: 8, magnesium: 5, bicarbonate: 20, chloride: 8, sulfate: 4 }, { calcium: 8, magnesium: 5, bicarbonate: 20 }))).toBeLessThan(scoreGeminiWatermancerCandidate(route({ calcium: 30, sulfate: 40 }, { calcium: 8, magnesium: 5, bicarbonate: 20 }))));
  it('balances magnesium and calcium', () => expect(scoreGeminiWatermancerCandidate(route({ magnesium: 20, calcium: 2 }, { magnesium: 10, calcium: 10 }))).toBeGreaterThan(scoreGeminiWatermancerCandidate(route({ magnesium: 10, calcium: 10 }, { magnesium: 10, calcium: 10 }))));
  it('ranks candidates without mutating input', () => {
    const candidates = [route({ chloride: 20 }), route({ chloride: 1 })];
    const ranked = rankGeminiWatermancerCandidates(candidates);
    expect(ranked[0]).toBe(candidates[1]); expect(candidates[0].id).toContain('20');
  });
  it('uses stable lexical ties', () => {
    const a = route({}); const b = { ...route({}), id: 'a' };
    expect(rankGeminiWatermancerCandidates([a, b]).map(x => x.id)).toEqual(['a', a.id]);
  });
});