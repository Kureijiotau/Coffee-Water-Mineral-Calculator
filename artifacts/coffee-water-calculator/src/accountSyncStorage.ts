import type { WaterProfile } from "@/waterData";
import type { WatermancerProfile } from "./watermancerProfiles";
import type { WaterTastingCollection } from "./waterTasting";
import type {
  LotusDropperCalibration,
  LotusDropperStyle,
  LotusStockDropMeasurement,
} from "./lotusConcentrate";
import { readConcentrateStockRecord, type MassConcentratePlanSnapshot } from "./concentrateStockStorage";

export const DIY_CONCENTRATE_INPUTS_STORAGE_KEY = "coffee-water-diy-concentrate-inputs";
export const ACCOUNT_SYNC_LOCAL_CHANGE_EVENT = "cwm:account-sync-local-change";
export const ACCOUNT_SYNC_REMOTE_CHANGE_EVENT = "cwm:account-sync-remote-change";
export const ACCOUNT_SYNC_BASELINE_KEY = "cwm.accountSync.baseline";

export type DiyConcentrateStoredInputs = {
  massStockPlan?: MassConcentratePlanSnapshot;
  stockWeightInput?: string;
  stockVolumeInput?: string;
  finalVolumeInput?: string;
  finalVolumeInputs?: Partial<Record<"liters" | "gallons", string>>;
  calibrationDropsInput?: string;
  calibrationWeightInput?: string;
  desiredPpmInput?: string;
  desiredSaltMgInput?: string;
  desiredDoseBasis?: "caco3" | "salt-mg";
  lotusCalibrationInputs?: Record<string, LotusDropperCalibration>;
  lotusStockDropMeasurements?: Record<string, LotusStockDropMeasurement>;
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
    const massPlan = readConcentrateStockRecord(source.massStockPlan);
    if (massPlan.kind === 'mass') stored.massStockPlan = massPlan.plan;
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
    if (
      source.finalVolumeInputs
      && typeof source.finalVolumeInputs === "object"
      && !Array.isArray(source.finalVolumeInputs)
    ) {
      const values = source.finalVolumeInputs as Record<string, unknown>;
      const finalVolumeInputs: NonNullable<DiyConcentrateStoredInputs["finalVolumeInputs"]> = {};
      if (typeof values.liters === "string") finalVolumeInputs.liters = values.liters;
      if (typeof values.gallons === "string") finalVolumeInputs.gallons = values.gallons;
      stored.finalVolumeInputs = finalVolumeInputs;
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
    if (
      source.lotusStockDropMeasurements
      && typeof source.lotusStockDropMeasurements === "object"
      && !Array.isArray(source.lotusStockDropMeasurements)
    ) {
      const measurements: NonNullable<DiyConcentrateStoredInputs["lotusStockDropMeasurements"]> = {};
      for (const [id, value] of Object.entries(source.lotusStockDropMeasurements as Record<string, unknown>)) {
        if (!id || !value || typeof value !== "object" || Array.isArray(value)) continue;
        const measurement = value as Record<string, unknown>;
        if (
          typeof measurement.dropsInput !== "string"
          || typeof measurement.weightInput !== "string"
        ) continue;
        measurements[id] = {
          dropsInput: measurement.dropsInput,
          weightInput: measurement.weightInput,
        };
      }
      stored.lotusStockDropMeasurements = measurements;
    }
    return stored;
  } catch {
    return null;
  }
}

export function loadDiyConcentrateInputs(): DiyConcentrateStoredInputs {
  return loadDiyConcentrateInputsRecord() ?? {};
}

/** Keep absence distinct from a rejected record so the UI cannot overwrite it. */
export function loadDiyConcentrateStockState() {
  const raw = readAccountSyncStorageValue(DIY_CONCENTRATE_INPUTS_STORAGE_KEY);
  if (raw === null) return null;
  try {
    const source = JSON.parse(raw);
    if (!source || typeof source !== 'object' || Array.isArray(source))
      return { kind: 'invalid' as const, reason: 'Invalid saved DIY concentrate record.' };
    if (!Object.prototype.hasOwnProperty.call(source, 'massStockPlan')) return null;
    return readConcentrateStockRecord(source.massStockPlan);
  } catch {
    return { kind: 'invalid' as const, reason: 'Saved DIY concentrate data is not readable JSON.' };
  }
}

export function archiveDiyConcentrateInputsForRecovery(): boolean {
  const raw = readAccountSyncStorageValue(DIY_CONCENTRATE_INPUTS_STORAGE_KEY);
  if (raw === null) return true;
  const recoveryKey = `${DIY_CONCENTRATE_INPUTS_STORAGE_KEY}:recovery`;
  writeAccountSyncStorageValue(recoveryKey, raw);
  return readAccountSyncStorageValue(recoveryKey) === raw;
}

export function saveDiyConcentrateInputs(
  inputs: DiyConcentrateStoredInputs,
  notifyLocalChange = true,
): void {
  let serialized: object = inputs;
  // Other DIY edits (e.g. water-tip calibration) must not erase rejected data.
  if (inputs.massStockPlan === undefined && loadDiyConcentrateStockState()?.kind === 'invalid') {
    const raw = readAccountSyncStorageValue(DIY_CONCENTRATE_INPUTS_STORAGE_KEY);
    try {
      const source = JSON.parse(raw ?? 'null');
      if (source && Object.prototype.hasOwnProperty.call(source, 'massStockPlan'))
        serialized = { ...inputs, massStockPlan: source.massStockPlan };
      else if (!archiveDiyConcentrateInputsForRecovery()) return;
    } catch {
      if (!archiveDiyConcentrateInputsForRecovery()) return;
    }
  }
  writeAccountSyncStorageValue(
    DIY_CONCENTRATE_INPUTS_STORAGE_KEY,
    JSON.stringify(serialized),
    notifyLocalChange,
  );
}

export function withDiyLotusCalibration(
  inputs: DiyConcentrateStoredInputs,
  style: LotusDropperStyle,
  calibration: LotusDropperCalibration,
): DiyConcentrateStoredInputs {
  return {
    ...inputs,
    lotusCalibrationInputs: {
      ...inputs.lotusCalibrationInputs,
      [style]: { ...calibration, style },
    },
  };
}