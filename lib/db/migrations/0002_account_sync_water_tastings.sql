ALTER TABLE "account_sync_data"
  ADD COLUMN "water_tastings" jsonb DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE "account_sync_data"
  ADD COLUMN "water_tasting_deletions" jsonb DEFAULT '[]'::jsonb NOT NULL;