-- Nullable acceptance record for new registrations.
-- Existing users keep NULL: there is no default and no backfill.
-- Safe to re-run: each column is added only when missing.
-- Apply with:
--   npx prisma db execute --file prisma/sql/20261031_user_terms_consent.sql --schema prisma/schema.prisma
-- Do not run `prisma migrate reset` or `prisma db push --force-reset`.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsVersion" TEXT;
