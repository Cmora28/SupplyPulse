-- Additive only. Production already has "User" from prisma db push.
-- IF NOT EXISTS so this still succeeds after the worker applies
-- prisma/sql/20261031_user_terms_consent.sql.
-- Nullable, with no default, so existing users stay NULL.
-- Do not reset the database.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsVersion" TEXT;
