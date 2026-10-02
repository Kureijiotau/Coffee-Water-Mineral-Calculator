import type { AccountSyncData, AccountSyncInput } from "@workspace/api-client-react";
import {
  accountSyncDataMatchesRemote,
  accountSyncLocalDataMatchesRemote,
  accountSyncRemoteToLocal,
  emptyAccountSyncData,
  mergeAccountSyncWithRemote,
  rebaseAccountSyncLocalChanges,
} from "./accountSyncMerge";
import type { AccountSyncLocalData } from "./accountSyncStorage";

export type AccountSyncEngineDependencies = {
  getRemote: () => Promise<AccountSyncData>;
  saveRemote: (input: AccountSyncInput) => Promise<AccountSyncData>;
  readLocal: () => AccountSyncLocalData;
  writeLocal: (data: AccountSyncLocalData, userId: string) => void;
  readBaseline: () => AccountSyncData | null;
  writeBaseline: (data: AccountSyncData) => void;
  isScopeActive: (userId: string) => boolean;
  notifyRemoteChange: () => void;
};

type SyncFlight = {
  userId: string;
  promise: Promise<boolean>;
  rerunRequested: boolean;
};

type SyncPassResult = {
  succeeded: boolean;
  needsAnotherPass: boolean;
};

export class AccountSyncEngine {
  private activeFlight: SyncFlight | null = null;

  constructor(private readonly dependencies: AccountSyncEngineDependencies) {}

  run(userId: string, localOverride?: AccountSyncLocalData): Promise<boolean> {
    if (!userId || !this.dependencies.isScopeActive(userId)) return Promise.resolve(false);

    const existingFlight = this.activeFlight;
    if (existingFlight?.userId === userId) {
      existingFlight.rerunRequested = true;
      return existingFlight.promise;
    }

    let nextLocalOverride = localOverride;
    const flight: SyncFlight = {
      userId,
      promise: Promise.resolve(false),
      rerunRequested: false,
    };
    this.activeFlight = flight;

    const promise = Promise.resolve().then(async () => {
      while (true) {
        flight.rerunRequested = false;
        const passLocalOverride = nextLocalOverride;
        nextLocalOverride = undefined;

        const result = await this.runPass(userId, passLocalOverride);
        if (!result.succeeded) return false;
        if (result.needsAnotherPass) flight.rerunRequested = true;
        if (!flight.rerunRequested) return true;
      }
    }).finally(() => {
      if (this.activeFlight === flight) this.activeFlight = null;
    });

    flight.promise = promise;
    return promise;
  }

  private async runPass(
    userId: string,
    localOverride?: AccountSyncLocalData,
  ): Promise<SyncPassResult> {
    const { dependencies } = this;
    if (!dependencies.isScopeActive(userId)) {
      return { succeeded: false, needsAnotherPass: false };
    }

    const remote = await dependencies.getRemote();
    if (!dependencies.isScopeActive(userId)) {
      return { succeeded: false, needsAnotherPass: false };
    }

    const inFlightLocal = localOverride ?? dependencies.readLocal();
    const baseline = dependencies.readBaseline() ?? emptyAccountSyncData();
    const saved = await pushMergedData(dependencies, userId, inFlightLocal, remote, baseline);
    if (!saved || !dependencies.isScopeActive(userId)) {
      return { succeeded: false, needsAnotherPass: false };
    }

    const latestLocal = dependencies.readLocal();
    const rebased = rebaseAccountSyncLocalChanges(inFlightLocal, latestLocal, saved);
    const rebasedLocal = accountSyncRemoteToLocal(rebased);
    const localNeedsRefresh = !accountSyncLocalDataMatchesRemote(latestLocal, rebased);

    dependencies.writeLocal(rebasedLocal, userId);
    dependencies.writeBaseline(saved);
    if (localNeedsRefresh) dependencies.notifyRemoteChange();

    return {
      succeeded: true,
      needsAnotherPass: !accountSyncLocalDataMatchesRemote(rebasedLocal, saved),
    };
  }
}

async function pushMergedData(
  dependencies: AccountSyncEngineDependencies,
  userId: string,
  local: AccountSyncLocalData,
  initialRemote: AccountSyncData,
  baseline: AccountSyncData,
): Promise<AccountSyncData | null> {
  let currentRemote = initialRemote;
  let pending = mergeAccountSyncWithRemote(baseline, local, currentRemote);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (accountSyncDataMatchesRemote(pending, currentRemote)) return currentRemote;
    if (!dependencies.isScopeActive(userId)) return null;

    try {
      return await dependencies.saveRemote(accountSyncInput(pending));
    } catch (error) {
      const latest = conflictData(error);
      if (!latest) throw error;
      pending = mergeAccountSyncWithRemote(
        currentRemote,
        accountSyncRemoteToLocal(pending),
        latest,
      );
      currentRemote = latest;
    }
  }

  throw new Error("Account data kept changing. Retry sync in a moment.");
}

function accountSyncInput(data: AccountSyncData): AccountSyncInput {
  return {
    expectedRevision: data.revision,
    alchemistProfiles: data.alchemistProfiles,
    watermancerProfiles: data.watermancerProfiles,
    diyConcentrateInputs: data.diyConcentrateInputs,
    waterTastings: data.waterTastings,
    waterTastingDeletions: data.waterTastingDeletions,
  };
}

function conflictData(error: unknown): AccountSyncData | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { status?: unknown; data?: unknown };
  if (candidate.status !== 409 || !candidate.data || typeof candidate.data !== "object") {
    return null;
  }
  const current = (candidate.data as { current?: unknown }).current;
  if (!current || typeof current !== "object") return null;
  const data = current as Partial<AccountSyncData>;
  if (
    !Number.isInteger(data.revision)
    || !Array.isArray(data.alchemistProfiles)
    || !Array.isArray(data.watermancerProfiles)
    || !Array.isArray(data.waterTastings)
    || !Array.isArray(data.waterTastingDeletions)
  ) {
    return null;
  }
  return current as AccountSyncData;
}