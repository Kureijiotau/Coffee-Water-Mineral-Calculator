import { Router, type IRouter, type Request, type Response } from "express";
import { db, watersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router: IRouter = Router();

function classifyDatabaseError(err: unknown): string {
  const code = typeof err === "object" && err !== null && "code" in err
    ? String((err as { code?: unknown }).code)
    : "";

  if (code === "42P01") return "DATABASE_TABLE_MISSING";
  if (code === "42703" || code === "42804" || code === "42883") {
    return "DATABASE_SCHEMA_MISMATCH";
  }
  if (code === "28P01" || code === "3D000") return "DATABASE_AUTH_FAILED";
  if (code === "42501") return "DATABASE_PERMISSION_DENIED";
  if (
    code.startsWith("08") ||
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT"
  ) {
    return "DATABASE_CONNECTION_FAILED";
  }

  return "DATABASE_QUERY_FAILED";
}

function getSafeDatabaseError(err: unknown): {
  code?: string;
  message?: string;
} {
  if (!err || typeof err !== "object") return {};

  const rawCode = "code" in err ? (err as { code?: unknown }).code : undefined;
  const rawMessage = "message" in err
    ? (err as { message?: unknown }).message
    : undefined;
  const code = typeof rawCode === "string" ? rawCode : undefined;
  const message = typeof rawMessage === "string"
    ? rawMessage
        .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-database-url]")
        .slice(0, 240)
    : undefined;

  return { code, message };
}

/**
 * GET /api/waters
 * Returns all saved mineral water entries, newest first.
 */
router.get("/waters", async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(watersTable)
      .orderBy(desc(watersTable.createdAt));
    res.json({ waters: rows });
  } catch (err: any) {
    console.error("Error fetching waters:", err);
    res.status(500).json({
      error: "Failed to fetch waters",
      diagnostic: classifyDatabaseError(err),
      database: getSafeDatabaseError(err),
    });
  }
});

/**
 * POST /api/waters
 * Save a new mineral water entry (auto-called on scan).
 * Body: { name?: string, ions: Record<string, number> }
 */
router.post("/waters", async (req: Request, res: Response) => {
  try {
    const { name, ions, shared } = req.body;
    if (!ions || typeof ions !== "object" || Object.keys(ions).length === 0) {
      res.status(400).json({ error: "Missing or empty 'ions' field" });
      return;
    }

    const [saved] = await db
      .insert(watersTable)
      .values({ name: name ?? "", ions, shared: shared ?? 'no' })
      .returning();

    res.status(201).json({ water: saved });
  } catch (err: any) {
    console.error("Error saving water:", err);
    res.status(500).json({ error: "Failed to save water" });
  }
});

/**
 * DELETE /api/waters/:id
 * Remove a saved water entry.
 */
router.delete("/waters/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(watersTable).where(eq(watersTable.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    console.error("Error deleting water:", err);
    res.status(500).json({ error: "Failed to delete water" });
  }
});

export default router;
