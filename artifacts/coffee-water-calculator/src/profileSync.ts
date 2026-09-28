export interface IdentifiedProfile {
  id: string;
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