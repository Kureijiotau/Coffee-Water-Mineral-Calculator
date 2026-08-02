import { Router, type IRouter, type Request, type Response } from "express";
import { db, watersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { SHARED_WATERS } from "../data/sharedWaters";

const router: IRouter = Router();
const PUBLIC_WATER_ION_LIMIT = 100_000;

function catalogName(name: string): string {
  return name
    .replace(/\s+—\s+madensulari\.com\s*$/i, "")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

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

function normalizeWaterIons(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, rawValue]) => [key, Number(rawValue)] as const)
      .filter(([, parsed]) => Number.isFinite(parsed) && parsed >= 0),
  );
}

function publicWaterKey(name: string, ions: unknown): string {
  const normalizedName = name.trim().toLocaleLowerCase("tr-TR");
  const normalizedIons = Object.entries(normalizeWaterIons(ions))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
  return `${normalizedName}::${normalizedIons}`;
}

function deduplicatePublicWaters<T extends { name: string; ions: unknown }>(waters: T[]): T[] {
  const seen = new Set<string>();
  return waters.filter(water => {
    const key = publicWaterKey(water.name, water.ions);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseWaterIons(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length === 0 || entries.length > 32) return null;

  const ions: Record<string, number> = {};
  for (const [key, rawValue] of entries) {
    if (!/^[a-z][a-z0-9_-]{0,31}$/i.test(key)) return null;
    const parsed = typeof rawValue === "number" ? rawValue : Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > PUBLIC_WATER_ION_LIMIT) return null;
    ions[key] = parsed;
  }
  return ions;
}

function hasAdminDeleteAccess(req: Request): boolean {
  const configuredToken = process.env.COMMUNITY_WATERS_ADMIN_TOKEN;
  const suppliedToken = req.header("x-community-waters-admin-token");
  return Boolean(configuredToken && suppliedToken && suppliedToken === configuredToken);
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
      .where(eq(watersTable.shared, "yes"))
      .orderBy(desc(watersTable.createdAt));
    const metadataByName = new Map(
      SHARED_WATERS
        .filter(water => water.metadata)
        .map(water => [catalogName(water.name), water.metadata]),
    );
    const enrichedRows = rows.map(row => {
      const metadata = metadataByName.get(catalogName(row.name));
      const ions = normalizeWaterIons(row.ions);
      return metadata ? { ...row, ions, metadata } : { ...row, ions };
    });
    res.status(200).json({ waters: deduplicatePublicWaters(enrichedRows) });
  } catch (err: any) {
    console.error("Error fetching waters:", err);
    // The public catalog is bundled with the API so a missing Vercel
    // production schema cannot break the calculator's water selector.
    res.status(200).json({
      waters: deduplicatePublicWaters(SHARED_WATERS.filter(water => water.shared === "yes")),
    });
  }
});

/**
 * POST /api/waters
 * Save a new mineral water entry (auto-called on scan).
 * Body: { name?: string, ions: Record<string, number>, shared: "yes" }
 */
router.post("/waters", async (req: Request, res: Response) => {
  try {
    const { name, ions, shared } = req.body;
    const parsedIons = parseWaterIons(ions);
    if (!parsedIons) {
      res.status(400).json({ error: "Invalid 'ions' field" });
      return;
    }
    if (shared !== "yes") {
      res.status(400).json({ error: "Community water submissions must explicitly set shared to 'yes'" });
      return;
    }
    const waterName = typeof name === "string" ? name.trim().slice(0, 160) : "";

    const [saved] = await db
      .insert(watersTable)
      .values({ name: waterName, ions: parsedIons, shared: "yes" })
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
    if (!hasAdminDeleteAccess(req)) {
      res.status(403).json({ error: "Deleting community waters requires administrator access" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const deleted = await db
      .delete(watersTable)
      .where(eq(watersTable.id, id))
      .returning({ id: watersTable.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "Water not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error("Error deleting water:", err);
    res.status(500).json({ error: "Failed to delete water" });
  }
});

export default router;
