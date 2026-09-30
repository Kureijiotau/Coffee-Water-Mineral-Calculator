import { useAuth } from "@clerk/react";
import {
  getAccountSyncData,
  saveAccountSyncData,
  type AccountSyncData,
  type AccountSyncInput,
} from "@workspace/api-client-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadUserCreatedProfiles, saveProfiles } from "@/profiles";
import {
  loadWatermancerProfiles,
  saveWatermancerProfiles,
} from "./watermancerProfiles";
import {
  accountSyncDataMatchesRemote,
  accountSyncLocalDataMatchesRemote,
  accountSyncRemoteToLocal,
  emptyAccountSyncData,
  mergeAccountSyncWithRemote,
  mergeFirstDeviceAccountData,
} from "./accountSyncMerge";
import {
  ACCOUNT_SYNC_BASELINE_KEY,
  loadDiyConcentrateInputsRecord,
  notifyAccountSyncRemoteChange,
  readAccountSyncStorageValue,
  saveDiyConcentrateInputs,
  setAccountSyncScope,
  getAccountSyncScope,
  writeAccountSyncStorageValue,
  type AccountSyncLocalData,
} from "./accountSyncStorage";

export type AccountSyncStatus = "guest" | "syncing" | "synced" | "error";

type AccountSyncContextValue = {
  status: AccountSyncStatus;
  userId: string | null;
  retrySync: () => void;
};

const AccountSyncContext = createContext<AccountSyncContextValue>({
  status: "guest",
  userId: null,
  retrySync: () => undefined,
});

function readLocalData(): AccountSyncLocalData {
  return {
    alchemistProfiles: loadUserCreatedProfiles(),
    watermancerProfiles: loadWatermancerProfiles(),
    diyConcentrateInputs: loadDiyConcentrateInputsRecord(),
  };
}

function writeLocalData(data: AccountSyncLocalData, userId: string): void {
  if (getAccountSyncScope() !== userId) return;
  saveProfiles(data.alchemistProfiles, false);
  saveWatermancerProfiles(data.watermancerProfiles, false);
  if (data.diyConcentrateInputs) {
    saveDiyConcentrateInputs(data.diyConcentrateInputs, false);
  }
}

function readBaseline(): AccountSyncData | null {
  const raw = readAccountSyncStorageValue(ACCOUNT_SYNC_BASELINE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AccountSyncData>;
    if (
      !Number.isInteger(value.revision)
      || !Array.isArray(value.alchemistProfiles)
      || !Array.isArray(value.watermancerProfiles)
    ) {
      return null;
    }
    return {
      ...emptyAccountSyncData(),
      ...value,
      revision: value.revision as number,
    } as AccountSyncData;
  } catch {
    return null;
  }
}

function writeBaseline(data: AccountSyncData): void {
  writeAccountSyncStorageValue(ACCOUNT_SYNC_BASELINE_KEY, JSON.stringify(data));
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
  ) {
    return null;
  }
  return current as AccountSyncData;
}

function accountSyncInput(data: AccountSyncData): AccountSyncInput {
  return {
    expectedRevision: data.revision,
    alchemistProfiles: data.alchemistProfiles,
    watermancerProfiles: data.watermancerProfiles,
    diyConcentrateInputs: data.diyConcentrateInputs,
  };
}

function completedSyncKey(userId: string): string {
  return `cwm.accountSync.completed:${encodeURIComponent(userId)}`;
}

function hasCompletedSync(userId: string): boolean {
  try {
    return localStorage.getItem(completedSyncKey(userId)) === "true";
  } catch {
    return false;
  }
}

function markSyncComplete(userId: string): void {
  try {
    localStorage.setItem(completedSyncKey(userId), "true");
  } catch {
    // The account sync can still work without a local migration marker.
  }
}

async function pushMergedData(
  userId: string,
  local: AccountSyncLocalData,
  initialRemote: AccountSyncData,
  baseline: AccountSyncData,
): Promise<AccountSyncData> {
  let currentRemote = initialRemote;
  let pending = mergeAccountSyncWithRemote(baseline, local, currentRemote);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (accountSyncDataMatchesRemote(pending, currentRemote)) return currentRemote;
    if (getAccountSyncScope() !== userId) {
      throw new Error("Account changed before sync completed");
    }

    try {
      return await saveAccountSyncData(
        accountSyncInput(pending),
        { credentials: "same-origin" },
      );
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

function AccountSyncLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-sm text-slate-300">
      Preparing your calculator…
    </div>
  );
}

export function AccountSyncProvider({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const [readyUserId, setReadyUserId] = useState<string | null | undefined>(undefined);
  const [status, setStatus] = useState<AccountSyncStatus>("guest");
  const baselineRef = useRef<AccountSyncData | null>(null);
  const syncPromiseRef = useRef<{ userId: string; promise: Promise<boolean> } | null>(null);

  const runSync = useCallback(async (localOverride?: AccountSyncLocalData): Promise<boolean> => {
    if (!userId || getAccountSyncScope() !== userId) return false;
    if (syncPromiseRef.current?.userId === userId) {
      return syncPromiseRef.current.promise;
    }

    const promise = (async () => {
      setStatus("syncing");
      try {
        const remote = await getAccountSyncData({ credentials: "same-origin" });
        if (getAccountSyncScope() !== userId) return false;

        const local = localOverride ?? readLocalData();
        const baseline = baselineRef.current ?? readBaseline() ?? emptyAccountSyncData();
        const saved = await pushMergedData(userId, local, remote, baseline);
        if (getAccountSyncScope() !== userId) return false;

        const savedLocal = accountSyncRemoteToLocal(saved);
        const localNeedsRefresh = !accountSyncLocalDataMatchesRemote(readLocalData(), saved);
        writeLocalData(savedLocal, userId);
        if (localNeedsRefresh) notifyAccountSyncRemoteChange();
        writeBaseline(saved);
        baselineRef.current = saved;
        markSyncComplete(userId);
        setStatus("synced");
        return true;
      } catch (error) {
        if (getAccountSyncScope() === userId) setStatus("error");
        console.error("Account sync failed", error);
        return false;
      }
    })();

    syncPromiseRef.current = { userId, promise };
    try {
      return await promise;
    } finally {
      if (syncPromiseRef.current?.promise === promise) syncPromiseRef.current = null;
    }
  }, [userId]);

  const retrySync = useCallback(() => {
    void runSync();
  }, [runSync]);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;

    if (!userId) {
      setAccountSyncScope(null);
      baselineRef.current = null;
      setStatus("guest");
      setReadyUserId(null);
      return () => {
        cancelled = true;
      };
    }

    setReadyUserId(undefined);
    setStatus("syncing");
    setAccountSyncScope(null);
    const guestData = readLocalData();
    setAccountSyncScope(userId);
    const accountData = readLocalData();
    const isFirstDeviceSync = !hasCompletedSync(userId);
    const initialLocal = isFirstDeviceSync
      ? mergeFirstDeviceAccountData(accountData, guestData)
      : accountData;
    const baseline = readBaseline() ?? emptyAccountSyncData();
    baselineRef.current = baseline;
    writeLocalData(initialLocal, userId);

    void runSync(initialLocal).then(() => {
      if (!cancelled && getAccountSyncScope() === userId) {
        setReadyUserId(userId);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId, runSync]);

  useEffect(() => {
    if (!isLoaded || !userId || readyUserId !== userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleLocalSync = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void runSync(), 400);
    };
    const syncOnReturn = () => {
      if (document.visibilityState === "visible") void runSync();
    };
    window.addEventListener("cwm:account-sync-local-change", scheduleLocalSync);
    window.addEventListener("focus", syncOnReturn);
    window.addEventListener("online", syncOnReturn);
    document.addEventListener("visibilitychange", syncOnReturn);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("cwm:account-sync-local-change", scheduleLocalSync);
      window.removeEventListener("focus", syncOnReturn);
      window.removeEventListener("online", syncOnReturn);
      document.removeEventListener("visibilitychange", syncOnReturn);
    };
  }, [isLoaded, userId, readyUserId, runSync]);

  const contextValue = {
    status: userId ? status : "guest" as const,
    userId: userId ?? null,
    retrySync,
  };

  if (!isLoaded || readyUserId !== (userId ?? null)) {
    return <AccountSyncLoading />;
  }

  return (
    <AccountSyncContext.Provider value={contextValue}>
      {children}
    </AccountSyncContext.Provider>
  );
}

export function useAccountSync(): AccountSyncContextValue {
  return useContext(AccountSyncContext);
}