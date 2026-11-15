-- Run once against an existing database (schema.sql already includes this
-- column for fresh databases):
--   psql "$DATABASE_URL" -f migrations/001_add_user_name.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
