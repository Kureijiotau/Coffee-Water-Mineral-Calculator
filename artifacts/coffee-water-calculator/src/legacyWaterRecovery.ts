import {
  ACTIVE_ION_IDS,
  computeIonTotals,
  type IonId,
} from '@/waterData';

export const LEGACY_MAGNESIA_SALT_TARGETS = {
  mgso4: 4.883476553307854,
  mgcl2: 11.2390986763469,
  nacl: 13,
} as const;

export const LEGACY_MAGNESIA_RECIPE_NAME = 'Magnesia (MgCl₂ MgSO₄ NaCl)';
export const LEGACY_MAGNESIA_PROVENANCE = 'Recovered legacy Magnesia baseline · 12 mL bottled water + 988 mL RO';
export const LEGACY_WATER_PAYLOAD_VERSION = 1;

export type LegacyWaterPayloadKind =
  | 'coffee-water-recipe'
  | 'coffee-water-plan'
  | 'watermancer-profile'
  | 'coffee-water-mix-source'
  | 'coffee-water-mix';

export type LegacyWaterPayload = {
  kind: LegacyWaterPayloadKind;
  version: number;
  name: string;
  saltTargets?: Partial<Record<string, number>>;
  ions?: Partial<Record<IonId, number>>;
};

export type LegacyWaterMigration = {
  id: string;
  kind: LegacyWaterPayloadKind;
  version: number;
  matches: (payload: LegacyWaterPayload) => boolean;
  recover: () => Record<IonId, number>;
};

const MAGNESIA_BASE_WATER_FRACTION = 0.012;
const MAGNESIA_BASE_WATER_IONS: Partial<Record<IonId, number>> = {
  sodium: 5.2 * MAGNESIA_BASE_WATER_FRACTION,
  calcium: 35.7 * MAGNESIA_BASE_WATER_FRACTION,
  magnesium: 172 * MAGNESIA_BASE_WATER_FRACTION,
  sulfate: 10.2 * MAGNESIA_BASE_WATER_FRACTION,
  bicarbonate: 950 * MAGNESIA_BASE_WATER_FRACTION,
};

function closeEnough(actual: unknown, expected: number, tolerance = 0.01): boolean {
  return typeof actual === 'number' && Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
}

const LEGACY_MAGNESIA_NAMES = new Set([
  LEGACY_MAGNESIA_RECIPE_NAME,
  'Magnesia (MgCl2 MgSO4 NaCl)',
]);

function hasLegacyMagnesiaName(name: string): boolean {
  return LEGACY_MAGNESIA_NAMES.has(name.trim());
}

function matchesLegacyMagnesiaSaltTargets(
  saltTargets: Partial<Record<string, number>>,
): boolean {
  const knownTargets = new Set(['mgso4', 'mgcl2', 'nacl']);
  return Object.entries(saltTargets).every(([id, value]) => (
    knownTargets.has(id)
      ? closeEnough(value, LEGACY_MAGNESIA_SALT_TARGETS[id as keyof typeof LEGACY_MAGNESIA_SALT_TARGETS])
      : !closeEnough(value, 0)
  ))
    && Object.entries(LEGACY_MAGNESIA_SALT_TARGETS).every(([id, expected]) =>
      closeEnough(saltTargets[id], expected));
}

function legacyMagnesiaSaltOnlyIons(): Record<IonId, number> {
  return computeIonTotals(LEGACY_MAGNESIA_SALT_TARGETS, {}, 1);
}

function matchesLegacyMagnesiaSaltOnlyIons(ions: Partial<Record<IonId, number>>): boolean {
  const saltOnly = legacyMagnesiaSaltOnlyIons();
  return ACTIVE_ION_IDS.every(id => closeEnough(ions[id], saltOnly[id], 0.03));
}

function recoverMagnesiaFinishedIons(): Record<IonId, number> {
  return computeIonTotals(
    LEGACY_MAGNESIA_SALT_TARGETS,
    MAGNESIA_BASE_WATER_IONS,
    1,
  );
}

const LEGACY_MAGNESIA_MATCHER = (payload: LegacyWaterPayload): boolean => {
  if (!hasLegacyMagnesiaName(payload.name)) return false;
  if (payload.ions) return matchesLegacyMagnesiaSaltOnlyIons(payload.ions);
  return payload.saltTargets ? matchesLegacyMagnesiaSaltTargets(payload.saltTargets) : false;
};

/**
 * Explicit migrations for payloads emitted by older app versions and the
 * persisted shapes derived from those payloads. New legacy repairs should add
 * an entry here instead of adding another name or value fingerprint at a
 * call site.
 */
export const LEGACY_WATER_MIGRATIONS: readonly LegacyWaterMigration[] = [
  ...([
    'coffee-water-recipe',
    'coffee-water-plan',
    'watermancer-profile',
    'coffee-water-mix-source',
    'coffee-water-mix',
  ] as const).map(kind => ({
    id: `magnesia-bottled-water-v1:${kind}`,
    kind,
    version: LEGACY_WATER_PAYLOAD_VERSION,
    matches: LEGACY_MAGNESIA_MATCHER,
    recover: recoverMagnesiaFinishedIons,
  })),
];

export function migrateLegacyWaterPayload(
  payload: LegacyWaterPayload,
): { migration: LegacyWaterMigration; ions: Record<IonId, number>; provenance: string } | null {
  const migration = LEGACY_WATER_MIGRATIONS.find(candidate =>
    candidate.kind === payload.kind
      && candidate.version === payload.version
      && candidate.matches(payload));
  return migration
    ? {
      migration,
      ions: migration.recover(),
      provenance: LEGACY_MAGNESIA_PROVENANCE,
    }
    : null;
}

export function isLegacyMagnesiaSaltTargetSet(
  name: string,
  saltTargets: Partial<Record<string, number>>,
): boolean {
  return Boolean(migrateLegacyWaterPayload({
    kind: 'coffee-water-recipe',
    version: LEGACY_WATER_PAYLOAD_VERSION,
    name,
    saltTargets,
  }));
}

export function recoverLegacyMagnesiaFinishedIons(
  name: string,
  saltTargets: Partial<Record<string, number>>,
): Record<IonId, number> | null {
  return migrateLegacyWaterPayload({
    kind: 'coffee-water-recipe',
    version: LEGACY_WATER_PAYLOAD_VERSION,
    name,
    saltTargets,
  })?.ions ?? null;
}

export function isLegacyMagnesiaSaltOnlySnapshot(
  name: string,
  ions: Partial<Record<IonId, number>>,
): boolean {
  return Boolean(migrateLegacyWaterPayload({
    kind: 'coffee-water-mix-source',
    version: LEGACY_WATER_PAYLOAD_VERSION,
    name,
    ions,
  }));
}

export function recoverLegacyMagnesiaSaltOnlySnapshot(
  name: string,
  ions: Partial<Record<IonId, number>>,
): Record<IonId, number> | null {
  return migrateLegacyWaterPayload({
    kind: 'coffee-water-mix-source',
    version: LEGACY_WATER_PAYLOAD_VERSION,
    name,
    ions,
  })?.ions ?? null;
}

export function recoverLegacyMagnesiaProfileIons(
  name: string,
  targets: Partial<Record<IonId, number>>,
): Record<IonId, number> | null {
  return migrateLegacyWaterPayload({
    kind: 'watermancer-profile',
    version: LEGACY_WATER_PAYLOAD_VERSION,
    name,
    ions: targets,
  })?.ions ?? null;
}