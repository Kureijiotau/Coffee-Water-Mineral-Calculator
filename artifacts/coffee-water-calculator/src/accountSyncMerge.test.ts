import { describe, expect, it } from "vitest";
import type { AccountSyncData } from "@workspace/api-client-react";
import type { WaterProfile } from "@/waterData";
import {
  emptyAccountSyncData,
  mergeAccountSyncWithRemote,
  mergeFirstDeviceAccountData,
  mergeWaterTastingCollections,
  rebaseAccountSyncLocalChanges,
} from "./accountSyncMerge";
import type { AccountSyncLocalData } from "./accountSyncStorage";
import type { WatermancerProfile } from "./watermancerProfiles";
import type { WaterTastingRecord } from "./waterTasting";
import {
  deduplicateWatermancerProfiles,
  remapSavedWatermancerTargetSource,
} from "./profileSync";

function alchemistProfile(id: string, name: string): WaterProfile {
  return {
    id,
    name,
    locked: false,
    ranges: {} as WaterProfile["ranges"],
  };
}

function targetProfile(id: string, name: string): WatermancerProfile {
  return {
    id,
    name,
    targets: { calcium: 100 },
  };
}

function serverData(overrides: Partial<AccountSyncData> = {}): AccountSyncData {
  return { ...emptyAccountSyncData(), ...overrides };
}

function localData(overrides: Partial<AccountSyncLocalData> = {}): AccountSyncLocalData {
  return {
    alchemistProfiles: [],
    watermancerProfiles: [],
    diyConcentrateInputs: null,
    waterTastingCollection: { records: [], deletions: [] },
    ...overrides,
  };
}

function tastingRecord(id: string, updatedAt: string, notes?: string): WaterTastingRecord {
  return {
    id,
    profileSourceId: "saved:water",
    profileNameSnapshot: "Bright Water",
    coffee: {},
    descriptorIds: [],
    ...(notes ? { notes } : {}),
    scoringVersion: 2,
    descriptive: {},
    affective: {},
    createdAt: "2026-09-28T09:00:00.000Z",
    updatedAt,
  };
}

describe("account sync merge", () => {
  it("keeps independent profile additions and a local edit to the same profile", () => {
    const baseline = serverData({
      alchemistProfiles: [alchemistProfile("shared", "Original")],
      watermancerProfiles: [targetProfile("shared-target", "Original target")],
    });
    const local = localData({
      alchemistProfiles: [
        alchemistProfile("shared", "Edited here"),
        alchemistProfile("local-only", "Local addition"),
      ],
      watermancerProfiles: [
        targetProfile("shared-target", "Edited here"),
        targetProfile("local-target", "Local target"),
      ],
    });
    const remote = serverData({
      revision: 4,
      alchemistProfiles: [
        alchemistProfile("shared", "Original"),
        alchemistProfile("remote-only", "Remote addition"),
      ],
      watermancerProfiles: [
        targetProfile("shared-target", "Original target"),
        targetProfile("remote-target", "Remote target"),
      ],
    });

    const merged = mergeAccountSyncWithRemote(baseline, local, remote);

    expect(merged.alchemistProfiles.map(profile => [profile.id, profile.name])).toEqual([
      ["shared", "Edited here"],
      ["remote-only", "Remote addition"],
      ["local-only", "Local addition"],
    ]);
    expect(merged.watermancerProfiles.map(profile => [profile.id, profile.name])).toEqual([
      ["shared-target", "Edited here"],
      ["remote-target", "Remote target"],
      ["local-target", "Local target"],
    ]);
  });

  it("uses saved account DIY values over a device's different local values", () => {
    const baseline = serverData();
    const local = localData({
      diyConcentrateInputs: { desiredPpmInput: "500" },
    });
    const remote = serverData({
      revision: 2,
      diyConcentrateInputs: { desiredPpmInput: "750" },
    });

    expect(
      mergeAccountSyncWithRemote(baseline, local, remote).diyConcentrateInputs,
    ).toEqual({ desiredPpmInput: "750" });
  });

  it("seeds DIY inputs when the account has no saved values", () => {
    const local = localData({
      diyConcentrateInputs: { stockWeightInput: "125" },
    });

    expect(
      mergeAccountSyncWithRemote(serverData(), local, serverData()).diyConcentrateInputs,
    ).toEqual({ stockWeightInput: "125" });
  });

  it("keeps a local DIY edit when the cloud value has not changed since the baseline", () => {
    const baseline = serverData({
      diyConcentrateInputs: { desiredPpmInput: "500" },
    });
    const local = localData({
      diyConcentrateInputs: { desiredPpmInput: "600" },
    });
    const remote = serverData({
      revision: 7,
      diyConcentrateInputs: { desiredPpmInput: "500" },
    });

    expect(
      mergeAccountSyncWithRemote(baseline, local, remote).diyConcentrateInputs,
    ).toEqual({ desiredPpmInput: "600" });
  });

  it("merges guest profiles into a first-device account cache by ID", () => {
    const account = localData({
      alchemistProfiles: [
        alchemistProfile("shared", "Account cache"),
        alchemistProfile("account-only", "Account profile"),
      ],
      diyConcentrateInputs: { desiredPpmInput: "700" },
    });
    const guest = localData({
      alchemistProfiles: [
        alchemistProfile("shared", "Guest copy"),
        alchemistProfile("guest-only", "Guest profile"),
      ],
      diyConcentrateInputs: { desiredPpmInput: "500" },
    });

    const merged = mergeFirstDeviceAccountData(account, guest);

    expect(merged.alchemistProfiles.map(profile => [profile.id, profile.name])).toEqual([
      ["shared", "Account cache"],
      ["guest-only", "Guest profile"],
      ["account-only", "Account profile"],
    ]);
    expect(merged.diyConcentrateInputs).toEqual({ desiredPpmInput: "700" });
  });
  it("deduplicates same-name, same-target profiles on first-device sync and keeps the account copy", () => {
    const accountCopy = {
      ...targetProfile("account-copy", "Version 38"),
      targets: { calcium: 100, magnesium: 20 },
      details: "Account profile",
    };
    const guestCopy = { ...accountCopy, id: "guest-copy", details: "Guest profile" };
    const merged = mergeFirstDeviceAccountData(
      localData({
        watermancerProfiles: [
          accountCopy,
          { ...accountCopy, id: "different-target", targets: { calcium: 101, magnesium: 20 } },
          { ...accountCopy, id: "different-name", name: "version 38" },
        ],
      }),
      localData({ watermancerProfiles: [guestCopy] }),
    );

    expect(merged.watermancerProfiles.map(profile => profile.id)).toEqual([
      "account-copy",
      "different-target",
      "different-name",
    ]);
    expect(merged.watermancerProfiles.find(profile => profile.id === "account-copy")?.details)
      .toBe("Account profile");
  });

  it("deduplicates same-name, same-target profiles on later sync and keeps the remote copy", () => {
    const localCopy = {
      ...targetProfile("local-copy", "Version 38"),
      targets: { calcium: 100 },
      details: "Local profile",
    };
    const remoteCopy = {
      ...localCopy,
      id: "remote-copy",
      targets: { calcium: 100 },
      details: "Account profile",
    };
    const merged = mergeAccountSyncWithRemote(
      serverData(),
      localData({
        watermancerProfiles: [
          localCopy,
          { ...localCopy, id: "different-target", targets: { calcium: 101 } },
          { ...localCopy, id: "different-name", name: "version 38" },
        ],
      }),
      serverData({ watermancerProfiles: [remoteCopy] }),
    );

    expect(merged.watermancerProfiles.map(profile => profile.id)).toEqual([
      "remote-copy",
      "different-target",
      "different-name",
    ]);
    expect(merged.watermancerProfiles[0]?.details).toBe("Account profile");
  });

  it("deduplicates a pending local profile against the account copy on conflict retry", () => {
    const baseline = serverData();
    const localCopy = {
      ...targetProfile("local-copy", "Version 38"),
      targets: { calcium: 100 },
      details: "Local profile",
    };
    const pending = mergeAccountSyncWithRemote(
      baseline,
      localData({
        watermancerProfiles: [
          localCopy,
          { ...localCopy, id: "different-target", targets: { calcium: 101 } },
        ],
      }),
      baseline,
    );
    const remoteCopy = {
      ...localCopy,
      id: "remote-copy",
      details: "Account profile",
    };
    const retried = mergeAccountSyncWithRemote(
      baseline,
      localData({ watermancerProfiles: pending.watermancerProfiles }),
      serverData({ watermancerProfiles: [remoteCopy] }),
    );

    expect(retried.watermancerProfiles.map(profile => profile.id)).toEqual([
      "remote-copy",
      "different-target",
    ]);
    expect(retried.watermancerProfiles[0]?.details).toBe("Account profile");
  });

  it("rebases deletions and edits made after the request snapshot over its response", () => {
    const removedProfile = targetProfile("removed-during-save", "Saved target");
    const keptProfile = targetProfile("kept", "Kept target");
    const remoteAddition = targetProfile("remote-addition", "Remote target");
    const lateLocalAddition = targetProfile("late-addition", "Late target");
    const inFlightLocal = localData({
      watermancerProfiles: [removedProfile, keptProfile],
      diyConcentrateInputs: { stockWeightInput: "before request" },
    });
    const latestLocal = localData({
      watermancerProfiles: [keptProfile, lateLocalAddition],
      diyConcentrateInputs: { stockWeightInput: "edited during request" },
    });
    const response = serverData({
      watermancerProfiles: [removedProfile, keptProfile, remoteAddition],
      diyConcentrateInputs: { stockWeightInput: "older submitted value" },
    });

    const rebased = rebaseAccountSyncLocalChanges(inFlightLocal, latestLocal, response);

    expect(rebased.watermancerProfiles.map(profile => profile.id)).toEqual([
      "kept",
      "remote-addition",
      "late-addition",
    ]);
    expect(rebased.diyConcentrateInputs).toEqual({
      stockWeightInput: "edited during request",
    });
  });

  it("compares target maps independent of key order but distinguishes missing targets from zero", () => {
    const profiles = deduplicateWatermancerProfiles([
      {
        ...targetProfile("first", "Version 38"),
        targets: { calcium: 100, magnesium: 0 },
      },
      {
        ...targetProfile("same-targets", "Version 38"),
        targets: { magnesium: 0, calcium: 100 },
      },
      {
        ...targetProfile("missing-magnesium", "Version 38"),
        targets: { calcium: 100 },
      },
    ]);

    expect(profiles.map(profile => profile.id)).toEqual(["first", "missing-magnesium"]);
  });

  it("keeps saved target selections attached to the surviving duplicate profile", () => {
    const previous = {
      ...targetProfile("local-copy", "Version 38"),
      details: "Local profile",
    };
    const survivor = {
      ...previous,
      id: "remote-copy",
      details: "Account profile",
    };

    expect(remapSavedWatermancerTargetSource(
      "saved:local-copy",
      [previous],
      [survivor],
    )).toBe("saved:remote-copy");
    expect(remapSavedWatermancerTargetSource(
      "recipe:local-copy",
      [previous],
      [survivor],
    )).toBe("recipe:remote-copy");
    expect(remapSavedWatermancerTargetSource(
      "saved:unrelated",
      [previous],
      [survivor],
    )).toBe("saved:unrelated");
  });

  it("merges independent tasting additions and keeps the latest edit by record ID", () => {
    const older = tastingRecord("shared-tasting", "2026-09-28T10:00:00.000Z", "local old");
    const newer = tastingRecord("shared-tasting", "2026-09-28T11:00:00.000Z", "remote new");
    const localOnly = tastingRecord("local-tasting", "2026-09-28T10:30:00.000Z");
    const remoteOnly = tastingRecord("remote-tasting", "2026-09-28T10:45:00.000Z");

    const merged = mergeAccountSyncWithRemote(
      emptyAccountSyncData(),
      localData({
        waterTastingCollection: { records: [older, localOnly], deletions: [] },
      }),
      serverData({ waterTastings: [newer, remoteOnly] }),
    );

    expect(merged.waterTastings.map(record => record.id).sort())
      .toEqual(["local-tasting", "remote-tasting", "shared-tasting"]);
    expect(merged.waterTastings.find(record => record.id === "shared-tasting")?.notes)
      .toBe("remote new");
  });

  it("keeps tombstones over stale offline records and lets a later edit supersede them", () => {
    const oldRecord = tastingRecord("deleted-tasting", "2026-09-28T10:00:00.000Z");
    const deletion = { id: oldRecord.id, deletedAt: "2026-09-28T11:00:00.000Z" };
    const deleted = mergeWaterTastingCollections(
      { records: [oldRecord], deletions: [] },
      { records: [], deletions: [deletion] },
    );
    expect(deleted).toEqual({ records: [], deletions: [deletion] });

    const laterEdit = tastingRecord("deleted-tasting", "2026-09-28T12:00:00.000Z", "edited later");
    const restored = mergeWaterTastingCollections(
      { records: [], deletions: [deletion] },
      { records: [laterEdit], deletions: [] },
    );
    expect(restored).toEqual({ records: [laterEdit], deletions: [] });
  });

  it("merges guest tastings on first-device sign-in and rebases a deletion made in flight", () => {
    const accountRecord = tastingRecord("same-tasting", "2026-09-28T11:00:00.000Z", "account");
    const guestRecord = tastingRecord("same-tasting", "2026-09-28T10:00:00.000Z", "guest");
    const guestOnly = tastingRecord("guest-only", "2026-09-28T09:00:00.000Z");
    const firstDevice = mergeFirstDeviceAccountData(
      localData({ waterTastingCollection: { records: [accountRecord], deletions: [] } }),
      localData({ waterTastingCollection: { records: [guestRecord, guestOnly], deletions: [] } }),
    );
    expect(firstDevice.waterTastingCollection?.records.map(record => record.id).sort())
      .toEqual(["guest-only", "same-tasting"]);
    expect(firstDevice.waterTastingCollection?.records.find(record => record.id === "same-tasting")?.notes)
      .toBe("account");

    const deletion = { id: accountRecord.id, deletedAt: "2026-09-28T12:00:00.000Z" };
    const rebased = rebaseAccountSyncLocalChanges(
      localData({ waterTastingCollection: { records: [accountRecord], deletions: [] } }),
      localData({ waterTastingCollection: { records: [], deletions: [deletion] } }),
      serverData({ waterTastings: [accountRecord] }),
    );
    expect(rebased.waterTastings).toEqual([]);
    expect(rebased.waterTastingDeletions).toEqual([deletion]);
  });
});