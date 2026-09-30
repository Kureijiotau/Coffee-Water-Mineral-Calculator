import { getAuth } from "@clerk/express";
import { and, eq, sql } from "drizzle-orm";
import { Router } from "express";
import {
  accountSyncDataTable,
  db,
} from "@workspace/db";
import {
  SaveAccountSyncDataBody,
  type AccountSyncData,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

function emptyAccountData(): AccountSyncData {
  return {
    revision: 0,
    updatedAt: null,
    alchemistProfiles: [],
    watermancerProfiles: [],
    diyConcentrateInputs: null,
  };
}

function serializeAccountData(
  row: typeof accountSyncDataTable.$inferSelect,
): AccountSyncData {
  return {
    revision: row.revision,
    updatedAt: row.updatedAt,
    alchemistProfiles: row.alchemistProfiles as AccountSyncData["alchemistProfiles"],
    watermancerProfiles: row.watermancerProfiles as AccountSyncData["watermancerProfiles"],
    diyConcentrateInputs: row.diyConcentrateInputs as AccountSyncData["diyConcentrateInputs"],
  };
}

async function readAccountData(userId: string): Promise<AccountSyncData> {
  if (!db) throw new Error("Database is not configured");
  const [row] = await db
    .select()
    .from(accountSyncDataTable)
    .where(eq(accountSyncDataTable.userId, userId))
    .limit(1);
  return row ? serializeAccountData(row) : emptyAccountData();
}

router.get("/account/sync", async (req, res) => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!db) {
    res.status(503).json({ error: "Account sync storage is unavailable" });
    return;
  }

  try {
    res.json(await readAccountData(userId));
  } catch (error) {
    logger.error({ err: error }, "Could not load account sync data");
    res.status(503).json({ error: "Account sync storage is unavailable" });
  }
});

router.put("/account/sync", async (req, res) => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!db) {
    res.status(503).json({ error: "Account sync storage is unavailable" });
    return;
  }

  const parsed = SaveAccountSyncDataBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid account sync data" });
    return;
  }

  const {
    expectedRevision,
    alchemistProfiles,
    watermancerProfiles,
    diyConcentrateInputs,
  } = parsed.data;

  try {
    const [existing] = await db
      .select({ revision: accountSyncDataTable.revision })
      .from(accountSyncDataTable)
      .where(eq(accountSyncDataTable.userId, userId))
      .limit(1);

    if (!existing) {
      if (expectedRevision !== 0) {
        res.status(409).json({ current: emptyAccountData() });
        return;
      }
      const [inserted] = await db
        .insert(accountSyncDataTable)
        .values({
          userId,
          revision: 1,
          alchemistProfiles,
          watermancerProfiles,
          diyConcentrateInputs,
        })
        .onConflictDoNothing({ target: accountSyncDataTable.userId })
        .returning();

      if (inserted) {
        res.json(serializeAccountData(inserted));
        return;
      }
    } else if (existing.revision === expectedRevision) {
      const [updated] = await db
        .update(accountSyncDataTable)
        .set({
          revision: sql`${accountSyncDataTable.revision} + 1`,
          alchemistProfiles,
          watermancerProfiles,
          diyConcentrateInputs,
          updatedAt: new Date(),
        })
        .where(and(
          eq(accountSyncDataTable.userId, userId),
          eq(accountSyncDataTable.revision, expectedRevision),
        ))
        .returning();

      if (updated) {
        res.json(serializeAccountData(updated));
        return;
      }
    }

    res.status(409).json({ current: await readAccountData(userId) });
  } catch (error) {
    logger.error({ err: error }, "Could not save account sync data");
    res.status(503).json({ error: "Account sync storage is unavailable" });
  }
});

export default router;