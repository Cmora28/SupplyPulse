-- Additive admin flag for an existing Supply Pulse database.
-- Does not rewrite rows. Existing users stay non-admin (default false)
-- until the worker bootstrap or `npm run admin:grant` sets the column.
-- Safe to re-run: the column is added only when missing.
-- Apply with:
--   npx prisma db execute --file prisma/sql/20261031_user_is_admin.sql --schema prisma/schema.prisma
-- Do not run `prisma migrate reset` or `prisma db push --force-reset`.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;
