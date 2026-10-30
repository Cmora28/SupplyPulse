-- Additive only. Existing supplier reports keep NULL riskScore/priority.
-- Existing users get immediate P1 alerts turned on (p1AlertEmails default true).
-- Safe to re-run if a prior `db push` already created these objects.

DO $$ BEGIN
    CREATE TYPE "ReportPriority" AS ENUM ('P1', 'P2', 'P3');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "SupplierReport" ADD COLUMN IF NOT EXISTS "riskScore" INTEGER;
ALTER TABLE "SupplierReport" ADD COLUMN IF NOT EXISTS "priority" "ReportPriority";
ALTER TABLE "SupplierReport" ADD COLUMN IF NOT EXISTS "riskFactors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "SupplierReport" ADD COLUMN IF NOT EXISTS "p1AlertSentAt" TIMESTAMP(3);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "p1AlertEmails" BOOLEAN NOT NULL DEFAULT true;
