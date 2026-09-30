-- Prepared PostgreSQL migration for the account-sync feature.
-- This is not run by the application or Vercel build; apply only through an
-- explicitly approved Neon production migration process.
CREATE TABLE account_sync_data (
  user_id TEXT PRIMARY KEY,
  alchemist_profiles JSONB NOT NULL,
  watermancer_profiles JSONB NOT NULL,
  diy_concentrate_inputs JSONB,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);