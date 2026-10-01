import { describe, expect, it } from "vitest";
import type { AccountSyncData } from "@workspace/api-client-react";
import type { WaterProfile } from "@/waterData";
import {
  emptyAccountSyncData,
  mergeAccountSyncWithRemote,
  mergeFirstDeviceAccountData,
} from "./accountSyncMerge";
import type { AccountSyncLocalData } from "./accountSyncStorage";
import type { WatermancerProfile } from "./watermancerProfiles";
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
    ...overrides,
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
});