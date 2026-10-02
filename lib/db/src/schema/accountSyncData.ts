import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const accountSyncDataTable = pgTable("account_sync_data", {
  userId: text("user_id").primaryKey(),
  alchemistProfiles: jsonb("alchemist_profiles")
    .notNull()
    .$type<Array<Record<string, unknown>>>(),
  watermancerProfiles: jsonb("watermancer_profiles")
    .notNull()
    .$type<Array<Record<string, unknown>>>(),
  diyConcentrateInputs: jsonb("diy_concentrate_inputs")
    .$type<Record<string, string> | null>(),
  waterTastings: jsonb("water_tastings")
    .notNull()
    .$type<Array<Record<string, unknown>>>()
    .default([]),
  waterTastingDeletions: jsonb("water_tasting_deletions")
    .notNull()
    .$type<Array<Record<string, unknown>>>()
    .default([]),
  revision: integer("revision").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccountSyncDataSchema = createInsertSchema(accountSyncDataTable).omit({
  updatedAt: true,
});
export type InsertAccountSyncData = z.infer<typeof insertAccountSyncDataSchema>;
export type AccountSyncData = typeof accountSyncDataTable.$inferSelect;