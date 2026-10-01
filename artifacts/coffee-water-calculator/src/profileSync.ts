export interface IdentifiedProfile {
  id: string;
}

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableValue(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sameWatermancerProfileIdentity<
  T extends IdentifiedProfile & { name: string; targets: unknown },
>(left: T, right: T): boolean {
  return left.name === right.name && stableValue(left.targets) === stableValue(right.targets);
}

export function deduplicateWatermancerProfiles<
  T extends IdentifiedProfile & { name: string; targets: unknown },
>(
  profiles: readonly T[],
  preferredProfileIds: readonly string[] = [],
): T[] {
  const preferredIds = new Set(preferredProfileIds);
  const unique: T[] = [];

  for (const profile of profiles) {
    const duplicateIndex = unique.findIndex(existing =>
      sameWatermancerProfileIdentity(existing, profile),
    );
    if (duplicateIndex < 0) {
      unique.push(profile);
      continue;
    }

    const current = unique[duplicateIndex];
    if (preferredIds.has(profile.id) && !preferredIds.has(current.id)) {
      unique[duplicateIndex] = profile;
    }
  }

  return unique;
}

export function remapSavedWatermancerTargetSource<
  T extends IdentifiedProfile & { name: string; targets: unknown },
>(
  source: string | null,
  previousProfiles: readonly T[],
  nextProfiles: readonly T[],
): string | null {
  const match = source?.match(/^(saved|recipe):(.+)$/);
  if (!match) return source;
  const previousProfile = previousProfiles.find(profile => profile.id === match[2]);
  if (!previousProfile) return source;
  const canonicalProfile = nextProfiles.find(profile =>
    sameWatermancerProfileIdentity(profile, previousProfile),
  );
  return canonicalProfile ? `${match[1]}:${canonicalProfile.id}` : source;
}

export function mergeWatermancerProfileCollections<
  T extends IdentifiedProfile & { name: string; targets: unknown },
>(
  baseline: readonly T[],
  local: readonly T[],
  remote: readonly T[],
  preferredProfileIds: readonly string[] = [],
): T[] {
  const merged = mergeProfileCollections(baseline, local, remote);
  return deduplicateWatermancerProfiles(merged, preferredProfileIds);
}

function sameValue<T>(left: T | undefined, right: T | undefined): boolean {
  if (left === right) return true;
  if (left === undefined || right === undefined) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

export function sameProfileCollection<T extends IdentifiedProfile>(
  left: readonly T[],
  right: readonly T[],
): boolean {
  return left.length === right.length
    && left.every((profile, index) => sameValue(profile, right[index]));
}

/**
 * Merge a pending local collection edit with a newer collection from storage.
 * Local changes win for the same ID; independent remote additions and edits
 * are retained. A local deletion also wins over a remote edit of that ID.
 */
export function mergeProfileCollections<T extends IdentifiedProfile>(
  baseline: readonly T[],
  local: readonly T[],
  remote: readonly T[],
): T[] {
  const baselineById = new Map(baseline.map(profile => [profile.id, profile]));
  const localById = new Map(local.map(profile => [profile.id, profile]));
  const remoteById = new Map(remote.map(profile => [profile.id, profile]));
  const ids = [...new Set([
    ...remote.map(profile => profile.id),
    ...local.map(profile => profile.id),
    ...baseline.map(profile => profile.id),
  ])];

  return ids.flatMap(id => {
    const baselineProfile = baselineById.get(id);
    const localProfile = localById.get(id);
    const localChanged = !sameValue(localProfile, baselineProfile);
    const selected = localChanged ? localProfile : remoteById.get(id);
    return selected ? [selected] : [];
  });
}