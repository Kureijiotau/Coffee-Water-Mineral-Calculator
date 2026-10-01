import type { AccountSyncData } from "@workspace/api-client-react";
import {
  mergeProfileCollections,
  mergeWatermancerProfileCollections,
  sameProfileCollection,
} from "./profileSync";
import type { AccountSyncLocalData } from "./accountSyncStorage";

const EMPTY_ACCOUNT_DATA: AccountSyncData = {
  revision: 0,
  updatedAt: null,
  alchemistProfiles: [],
  watermancerProfiles: [],
  diyConcentrateInputs: null,
};

export function accountSyncRemoteToLocal(data: AccountSyncData): AccountSyncLocalData {
  return {
    alchemistProfiles: data.alchemistProfiles as unknown as AccountSyncLocalData["alchemistProfiles"],
    watermancerProfiles: data.watermancerProfiles as unknown as AccountSyncLocalData["watermancerProfiles"],
    diyConcentrateInputs: data.diyConcentrateInputs,
  };
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
      === JSON.stringify(remote.diyConcentrateInputs);
}

export function accountSyncLocalDataMatchesRemote(
  local: AccountSyncLocalData,
  remote: AccountSyncData,
): boolean {
  const remoteLocal = accountSyncRemoteToLocal(remote);
  return sameProfileCollection(local.alchemistProfiles, remoteLocal.alchemistProfiles)
    && sameProfileCollection(local.watermancerProfiles, remoteLocal.watermancerProfiles)
    && JSON.stringify(local.diyConcentrateInputs)
      === JSON.stringify(remoteLocal.diyConcentrateInputs);
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
  };
}

export function emptyAccountSyncData(): AccountSyncData {
  return { ...EMPTY_ACCOUNT_DATA };
}