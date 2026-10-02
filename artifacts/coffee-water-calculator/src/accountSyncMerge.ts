import type { AccountSyncData } from "@workspace/api-client-react";
import {
  mergeProfileCollections,
  mergeWatermancerProfileCollections,
  sameProfileCollection,
} from "./profileSync";
import type { AccountSyncLocalData } from "./accountSyncStorage";
import type {
  WaterTastingCollection,
  WaterTastingDeletionMarker,
  WaterTastingRecord,
} from "./waterTasting";

const EMPTY_ACCOUNT_DATA: AccountSyncData = {
  revision: 0,
  updatedAt: null,
  alchemistProfiles: [],
  watermancerProfiles: [],
  diyConcentrateInputs: null,
  waterTastings: [],
  waterTastingDeletions: [],
};

export function accountSyncRemoteToLocal(data: AccountSyncData): AccountSyncLocalData {
  return {
    alchemistProfiles: data.alchemistProfiles as unknown as AccountSyncLocalData["alchemistProfiles"],
    watermancerProfiles: data.watermancerProfiles as unknown as AccountSyncLocalData["watermancerProfiles"],
    diyConcentrateInputs: data.diyConcentrateInputs,
    waterTastingCollection: {
      records: data.waterTastings as unknown as WaterTastingRecord[],
      deletions: data.waterTastingDeletions as WaterTastingDeletionMarker[],
    },
  };
}

export function mergeWaterTastingCollections(
  first: WaterTastingCollection,
  second: WaterTastingCollection,
): WaterTastingCollection {
  type Change =
    | { kind: "record"; timestamp: number; value: WaterTastingRecord }
    | { kind: "deletion"; timestamp: number; value: WaterTastingDeletionMarker };

  const changes = new Map<string, Change>();
  const consider = (id: string, candidate: Change) => {
    const current = changes.get(id);
    const candidateIsDeletion = candidate.kind === "deletion";
    const currentIsDeletion = current?.kind === "deletion";
    const candidateJson = JSON.stringify(candidate.value);
    const currentJson = current ? JSON.stringify(current.value) : "";
    if (
      !current
      || candidate.timestamp > current.timestamp
      || (candidate.timestamp === current.timestamp && candidateIsDeletion && !currentIsDeletion)
      || (candidate.timestamp === current.timestamp
        && candidate.kind === current.kind
        && candidateJson > currentJson)
    ) {
      changes.set(id, candidate);
    }
  };

  for (const collection of [first, second]) {
    for (const record of collection.records) {
      consider(record.id, {
        kind: "record",
        timestamp: Date.parse(record.updatedAt),
        value: record,
      });
    }
    for (const deletion of collection.deletions) {
      consider(deletion.id, {
        kind: "deletion",
        timestamp: Date.parse(deletion.deletedAt),
        value: deletion,
      });
    }
  }

  const records: WaterTastingRecord[] = [];
  const deletions: WaterTastingDeletionMarker[] = [];
  for (const change of changes.values()) {
    if (change.kind === "record") records.push(change.value);
    else deletions.push(change.value);
  }
  records.sort((a, b) => a.id.localeCompare(b.id));
  deletions.sort((a, b) => a.id.localeCompare(b.id));
  return { records, deletions };
}

export function mergeAccountSyncWithRemote(
  baseline: AccountSyncData,
  local: AccountSyncLocalData,
  remote: AccountSyncData,
): AccountSyncData {
  const remoteLocal = accountSyncRemoteToLocal(remote);
  const localDiyChanged = JSON.stringify(local.diyConcentrateInputs)
    !== JSON.stringify(baseline.diyConcentrateInputs);
  const remoteDiyChanged = JSON.stringify(remote.diyConcentrateInputs)
    !== JSON.stringify(baseline.diyConcentrateInputs);
  const localTastings = local.waterTastingCollection;
  const remoteTastings = remoteLocal.waterTastingCollection;

  return {
    ...remote,
    alchemistProfiles: mergeProfileCollections(
      baseline.alchemistProfiles as unknown as AccountSyncLocalData["alchemistProfiles"],
      local.alchemistProfiles,
      remoteLocal.alchemistProfiles,
    ) as unknown as AccountSyncData["alchemistProfiles"],
    watermancerProfiles: mergeWatermancerProfileCollections(
      baseline.watermancerProfiles as unknown as AccountSyncLocalData["watermancerProfiles"],
      local.watermancerProfiles,
      remoteLocal.watermancerProfiles,
    ) as unknown as AccountSyncData["watermancerProfiles"],
    // If the account already has DIY values, keep them authoritative when this
    // device has no saved baseline or when the remote value changed elsewhere.
    diyConcentrateInputs: remote.diyConcentrateInputs === null
      || (localDiyChanged && !remoteDiyChanged)
      ? local.diyConcentrateInputs
      : remote.diyConcentrateInputs,
    waterTastings: mergeWaterTastingCollections(
      localTastings ?? remoteTastings ?? { records: [], deletions: [] },
      remoteTastings ?? { records: [], deletions: [] },
    ).records as unknown as AccountSyncData["waterTastings"],
    waterTastingDeletions: mergeWaterTastingCollections(
      localTastings ?? remoteTastings ?? { records: [], deletions: [] },
      remoteTastings ?? { records: [], deletions: [] },
    ).deletions as unknown as AccountSyncData["waterTastingDeletions"],
  };
}

export function rebaseAccountSyncLocalChanges(
  inFlightLocal: AccountSyncLocalData,
  latestLocal: AccountSyncLocalData,
  remote: AccountSyncData,
): AccountSyncData {
  const remoteLocal = accountSyncRemoteToLocal(remote);
  return {
    ...remote,
    alchemistProfiles: mergeProfileCollections(
      inFlightLocal.alchemistProfiles,
      latestLocal.alchemistProfiles,
      remoteLocal.alchemistProfiles,
    ) as unknown as AccountSyncData["alchemistProfiles"],
    watermancerProfiles: mergeWatermancerProfileCollections(
      inFlightLocal.watermancerProfiles,
      latestLocal.watermancerProfiles,
      remoteLocal.watermancerProfiles,
    ) as unknown as AccountSyncData["watermancerProfiles"],
    diyConcentrateInputs: JSON.stringify(latestLocal.diyConcentrateInputs)
      !== JSON.stringify(inFlightLocal.diyConcentrateInputs)
      ? latestLocal.diyConcentrateInputs
      : remote.diyConcentrateInputs,
    ...(() => {
      const latestCollection = latestLocal.waterTastingCollection
        ?? remoteLocal.waterTastingCollection
        ?? { records: [], deletions: [] };
      const remoteCollection = remoteLocal.waterTastingCollection
        ?? { records: [], deletions: [] };
      const merged = mergeWaterTastingCollections(latestCollection, remoteCollection);
      return {
        waterTastings: merged.records as unknown as AccountSyncData["waterTastings"],
        waterTastingDeletions: merged.deletions as unknown as AccountSyncData["waterTastingDeletions"],
      };
    })(),
  };
}

export function accountSyncDataMatchesRemote(
  local: AccountSyncData,
  remote: AccountSyncData,
): boolean {
  return sameProfileCollection(
    local.alchemistProfiles as unknown as AccountSyncLocalData["alchemistProfiles"],
    remote.alchemistProfiles as unknown as AccountSyncLocalData["alchemistProfiles"],
  )
    && sameProfileCollection(
      local.watermancerProfiles as unknown as AccountSyncLocalData["watermancerProfiles"],
      remote.watermancerProfiles as unknown as AccountSyncLocalData["watermancerProfiles"],
    )
    && JSON.stringify(local.diyConcentrateInputs)
      === JSON.stringify(remote.diyConcentrateInputs)
    && JSON.stringify(local.waterTastings) === JSON.stringify(remote.waterTastings)
    && JSON.stringify(local.waterTastingDeletions) === JSON.stringify(remote.waterTastingDeletions);
}

export function accountSyncLocalDataMatchesRemote(
  local: AccountSyncLocalData,
  remote: AccountSyncData,
): boolean {
  const remoteLocal = accountSyncRemoteToLocal(remote);
  return sameProfileCollection(local.alchemistProfiles, remoteLocal.alchemistProfiles)
    && sameProfileCollection(local.watermancerProfiles, remoteLocal.watermancerProfiles)
    && JSON.stringify(local.diyConcentrateInputs) === JSON.stringify(remoteLocal.diyConcentrateInputs)
    && (local.waterTastingCollection === null
      || JSON.stringify(local.waterTastingCollection) === JSON.stringify(remoteLocal.waterTastingCollection));
}

export function mergeFirstDeviceAccountData(
  account: AccountSyncLocalData,
  guest: AccountSyncLocalData,
): AccountSyncLocalData {
  return {
    alchemistProfiles: mergeProfileCollections(
      [],
      account.alchemistProfiles,
      guest.alchemistProfiles,
    ),
    watermancerProfiles: mergeWatermancerProfileCollections(
      [],
      account.watermancerProfiles,
      guest.watermancerProfiles,
      account.watermancerProfiles.map(profile => profile.id),
    ),
    diyConcentrateInputs: account.diyConcentrateInputs ?? guest.diyConcentrateInputs,
    waterTastingCollection: account.waterTastingCollection === null
      ? guest.waterTastingCollection
      : guest.waterTastingCollection === null
        ? account.waterTastingCollection
        : mergeWaterTastingCollections(account.waterTastingCollection, guest.waterTastingCollection),
  };
}

export function emptyAccountSyncData(): AccountSyncData {
  return { ...EMPTY_ACCOUNT_DATA };
}