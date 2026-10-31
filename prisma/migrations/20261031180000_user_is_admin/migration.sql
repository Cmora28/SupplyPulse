-- Additive only. Production already has "User" from prisma db push.
-- IF NOT EXISTS so this still succeeds after the worker applies
-- prisma/sql/20261031_user_is_admin.sql. Do not reset the database.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;
