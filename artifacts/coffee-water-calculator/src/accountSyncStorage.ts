import type { WaterProfile } from "@/waterData";
import type { WatermancerProfile } from "./watermancerProfiles";
import type { WaterTastingCollection } from "./waterTasting";
import type { LotusDropperCalibration } from "./lotusConcentrate";

export const DIY_CONCENTRATE_INPUTS_STORAGE_KEY = "coffee-water-diy-concentrate-inputs";
export const ACCOUNT_SYNC_LOCAL_CHANGE_EVENT = "cwm:account-sync-local-change";
export const ACCOUNT_SYNC_REMOTE_CHANGE_EVENT = "cwm:account-sync-remote-change";
export const ACCOUNT_SYNC_BASELINE_KEY = "cwm.accountSync.baseline";

export type DiyConcentrateStoredInputs = {
  stockWeightInput?: string;
  stockVolumeInput?: string;
  finalVolumeInput?: string;
  calibrationDropsInput?: string;
  calibrationWeightInput?: string;
  desiredPpmInput?: string;
  desiredSaltMgInput?: string;
  desiredDoseBasis?: "caco3" | "salt-mg";
  lotusCalibrationInputs?: Record<string, LotusDropperCalibration>;
};

export type AccountSyncLocalData = {
  alchemistProfiles: WaterProfile[];
  watermancerProfiles: WatermancerProfile[];
  diyConcentrateInputs: DiyConcentrateStoredInputs | null;
  waterTastingCollection: WaterTastingCollection | null;
};

let activeAccountId: string | null = null;

export function setAccountSyncScope(userId: string | null): void {
  activeAccountId = userId;
}

export function getAccountSyncScope(): string | null {
  return activeAccountId;
}

export function getAccountSyncStorageKey(key: string): string {
  return activeAccountId
    ? `${key}::account:${encodeURIComponent(activeAccountId)}`
    : key;
}

export function readAccountSyncStorageValue(key: string): string | null {
  try {
    return localStorage.getItem(getAccountSyncStorageKey(key));
  } catch {
    return null;
  }
}

export function writeAccountSyncStorageValue(
  key: string,
  value: string,
  notifyLocalChange = false,
): void {
  try {
    localStorage.setItem(getAccountSyncStorageKey(key), value);
    if (notifyLocalChange) notifyAccountSyncLocalChange();
  } catch {
    // The calculator remains usable when browser storage is unavailable.
  }
}

export function notifyAccountSyncLocalChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACCOUNT_SYNC_LOCAL_CHANGE_EVENT));
  }
}

export function notifyAccountSyncRemoteChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACCOUNT_SYNC_REMOTE_CHANGE_EVENT));
  }
}

export function loadDiyConcentrateInputsRecord(): DiyConcentrateStoredInputs | null {
  const raw = readAccountSyncStorageValue(DIY_CONCENTRATE_INPUTS_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const source = parsed as Record<string, unknown>;
    const stored: DiyConcentrateStoredInputs = {};
    const stringKeys = [
      "stockWeightInput",
      "stockVolumeInput",
      "finalVolumeInput",
      "calibrationDropsInput",
      "calibrationWeightInput",
      "desiredPpmInput",
      "desiredSaltMgInput",
    ] as const;
    for (const key of stringKeys) {
      if (typeof source[key] === "string") stored[key] = source[key] as string;
    }
    if (source.desiredDoseBasis === "caco3" || source.desiredDoseBasis === "salt-mg") {
      stored.desiredDoseBasis = source.desiredDoseBasis;
    }
    if (
      source.lotusCalibrationInputs
      && typeof source.lotusCalibrationInputs === "object"
      && !Array.isArray(source.lotusCalibrationInputs)
    ) {
      const calibrations: NonNullable<DiyConcentrateStoredInputs["lotusCalibrationInputs"]> = {};
      for (const [id, value] of Object.entries(source.lotusCalibrationInputs as Record<string, unknown>)) {
        if (!id || !value || typeof value !== "object" || Array.isArray(value)) continue;
        const calibration = value as Record<string, unknown>;
        if (
          typeof calibration.dropsInput !== "string"
          || typeof calibration.weightInput !== "string"
        ) continue;
        calibrations[id] = {
          dropsInput: calibration.dropsInput,
          weightInput: calibration.weightInput,
          ...(calibration.style === "round" || calibration.style === "straight"
            ? { style: calibration.style }
            : {}),
        };
      }
      stored.lotusCalibrationInputs = calibrations;
    }
    return stored;
  } catch {
    return null;
  }
}

export function loadDiyConcentrateInputs(): DiyConcentrateStoredInputs {
  return loadDiyConcentrateInputsRecord() ?? {};
}

export function saveDiyConcentrateInputs(
  inputs: DiyConcentrateStoredInputs,
  notifyLocalChange = true,
): void {
  writeAccountSyncStorageValue(
    DIY_CONCENTRATE_INPUTS_STORAGE_KEY,
    JSON.stringify(inputs),
    notifyLocalChange,
  );
}