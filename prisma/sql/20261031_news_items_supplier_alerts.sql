-- Additive daily-alert tables for an existing Supply Pulse database.
-- Does not alter User, Supplier, SupplierReport, ReportRun, ReportRunItem, or AuditEvent.
-- Safe to re-run: tables, indexes, and foreign keys are created only when missing.
-- Apply with:
--   npx prisma db execute --file prisma/sql/20261031_news_items_supplier_alerts.sql --schema prisma/schema.prisma
-- Do not run `prisma migrate reset` or `prisma db push --force-reset`.

CREATE TABLE IF NOT EXISTS "NewsItem" (
    "id" TEXT NOT NULL,
    "supplierKey" TEXT NOT NULL,
    "urlHash" CHAR(64) NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw" JSONB NOT NULL,
    "jevP" DOUBLE PRECISION,
    "promptVersion" TEXT,
    "model" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',

    CONSTRAINT "NewsItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupplierAlert" (
    "id" TEXT NOT NULL,
    "newsItemId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NewsItem_supplierKey_publishedAt_idx" ON "NewsItem"("supplierKey", "publishedAt" DESC);
CREATE INDEX IF NOT EXISTS "NewsItem_fetchedAt_idx" ON "NewsItem"("fetchedAt");
CREATE INDEX IF NOT EXISTS "NewsItem_jevP_idx" ON "NewsItem"("jevP");
CREATE UNIQUE INDEX IF NOT EXISTS "NewsItem_supplierKey_urlHash_key" ON "NewsItem"("supplierKey", "urlHash");

CREATE INDEX IF NOT EXISTS "SupplierAlert_supplierId_idx" ON "SupplierAlert"("supplierId");
CREATE INDEX IF NOT EXISTS "SupplierAlert_sentAt_idx" ON "SupplierAlert"("sentAt");
CREATE UNIQUE INDEX IF NOT EXISTS "SupplierAlert_newsItemId_supplierId_key" ON "SupplierAlert"("newsItemId", "supplierId");

DO $$ BEGIN
  ALTER TABLE "SupplierAlert" ADD CONSTRAINT "SupplierAlert_newsItemId_fkey"
    FOREIGN KEY ("newsItemId") REFERENCES "NewsItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierAlert" ADD CONSTRAINT "SupplierAlert_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
