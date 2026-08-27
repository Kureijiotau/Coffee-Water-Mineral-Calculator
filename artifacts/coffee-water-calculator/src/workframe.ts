import { ACTIVE_ION_IDS, type IonId } from './waterData';
import type { IonicTargetValues } from './watermancerProfiles';

export type WorkframeDraft = {
  gh: number;
  kh: number;
  magnesium: number;
  calcium: number;
  sulfate: number;
  chloride: number;
  potassium: number;
  sodium: number;
  bicarbonate: number;
};

export type WorkframeMetrics = {
  ghKh: number | null;
  mgCa: number | null;
  kNa: number | null;
  anions: number;
  alkali: number;
};

export const WORKFRAME_DEFAULT_DRAFT: WorkframeDraft = {
  gh: 5.6,
  kh: 1.7,
  magnesium: 26,
  calcium: 52,
  sulfate: 58,
  chloride: 42,
  potassium: 8,
  sodium: 76,
  bicarbonate: 104,
};

const nonNegative = (value: number): number => (
  Number.isFinite(value) ? Math.max(value, 0) : 0
);

export function workframeMetrics(draft: WorkframeDraft): WorkframeMetrics {
  const gh = nonNegative(draft.gh);
  const kh = nonNegative(draft.kh);
  const magnesium = nonNegative(draft.magnesium);
  const calcium = nonNegative(draft.calcium);
  const potassium = nonNegative(draft.potassium);
  const sodium = nonNegative(draft.sodium);

  return {
    ghKh: kh > 0 ? gh / kh : null,
    mgCa: calcium > 0 ? magnesium / calcium : null,
    kNa: potassium > 0 ? sodium / potassium : null,
    anions: nonNegative(draft.sulfate) + nonNegative(draft.chloride),
    alkali: potassium + sodium,
  };
}

/**
 * Workframe's final profile is an ion target snapshot. GH/KH are relationship
 * anchors and remain visible as diagnostics; Watermancer receives the explicit
 * ion values so its existing solver can translate them into salts and waters.
 */
export function workframeTargetsFromDraft(draft: WorkframeDraft): IonicTargetValues {
  const values: Partial<Record<IonId, number>> = {
    calcium: nonNegative(draft.calcium),
    magnesium: nonNegative(draft.magnesium),
    bicarbonate: nonNegative(draft.bicarbonate),
    sulfate: nonNegative(draft.sulfate),
    chloride: nonNegative(draft.chloride),
    potassium: nonNegative(draft.potassium),
    sodium: nonNegative(draft.sodium),
  };

  return Object.fromEntries(
    ACTIVE_ION_IDS.map(id => [id, values[id] ?? 0]),
  ) as IonicTargetValues;
}

export function workframeConstraints(draft: WorkframeDraft): {
  ghKh: boolean;
  mgCa: boolean;
  anions: boolean;
  alkali: boolean;
  bicarbonate: boolean;
} {
  const metrics = workframeMetrics(draft);
  return {
    ghKh: metrics.ghKh !== null && metrics.ghKh >= 2.8 && metrics.ghKh <= 3.6,
    mgCa: metrics.mgCa !== null && metrics.mgCa >= 0.35 && metrics.mgCa <= 0.7,
    anions: metrics.anions <= 120,
    alkali: metrics.alkali <= 90 && metrics.kNa !== null && metrics.kNa >= 8 && metrics.kNa <= 12,
    bicarbonate: nonNegative(draft.bicarbonate) >= 92 && nonNegative(draft.bicarbonate) <= 112,
  };
}