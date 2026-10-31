-- Audit trail for the daily supplier news pipeline.
-- Additive and safe to re-run. Does not rewrite User, Supplier, reports, or AuditEvent.
-- NewsItem.runId and SupplierAlert outcome columns are added only when missing.
-- JevCall.newsItemId uses ON DELETE SET NULL so purging NewsItem cannot fail on this FK.
-- NewsRun deletion cascades to JevCall and NewsCandidate and sets NewsItem.runId to NULL.
-- Apply with:
--   npx prisma db execute --file prisma/sql/20261031_news_pipeline_audit.sql --schema prisma/schema.prisma
-- The worker also applies this file (and the news-item script) at startup.

CREATE TABLE IF NOT EXISTS "NewsRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "supplierKeys" INTEGER NOT NULL DEFAULT 0,
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "keywordHits" INTEGER NOT NULL DEFAULT 0,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "classified" INTEGER NOT NULL DEFAULT 0,
    "unclassified" INTEGER NOT NULL DEFAULT 0,
    "alerts" INTEGER NOT NULL DEFAULT 0,
    "emails" INTEGER NOT NULL DEFAULT 0,
    "purged" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "NewsRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NewsRun_startedAt_idx" ON "NewsRun"("startedAt" DESC);
CREATE INDEX IF NOT EXISTS "NewsRun_status_startedAt_idx" ON "NewsRun"("status", "startedAt" DESC);

DO $$ BEGIN
  ALTER TABLE "NewsItem" ADD COLUMN "runId" TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "NewsItem_runId_idx" ON "NewsItem"("runId");
CREATE INDEX IF NOT EXISTS "NewsItem_status_fetchedAt_idx" ON "NewsItem"("status", "fetchedAt" DESC);

DO $$ BEGIN
  ALTER TABLE "NewsItem" ADD CONSTRAINT "NewsItem_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "NewsRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "JevCall" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "newsItemId" TEXT,
    "requestBody" JSONB NOT NULL,
    "httpStatus" INTEGER,
    "ok" BOOLEAN NOT NULL,
    "reason" TEXT,
    "message" TEXT,
    "p" DOUBLE PRECISION,
    "band" TEXT,
    "model" TEXT,
    "promptVersion" TEXT,
    "latencyMs" INTEGER,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "responseRaw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JevCall_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JevCall_runId_createdAt_idx" ON "JevCall"("runId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "JevCall_newsItemId_createdAt_idx" ON "JevCall"("newsItemId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "JevCall_createdAt_idx" ON "JevCall"("createdAt");

DO $$ BEGIN
  ALTER TABLE "JevCall" ADD CONSTRAINT "JevCall_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "NewsRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "JevCall" ADD CONSTRAINT "JevCall_newsItemId_fkey"
    FOREIGN KEY ("newsItemId") REFERENCES "NewsItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "NewsCandidate" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "supplierKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "feed" TEXT,
    "source" TEXT,
    "publishedAt" TIMESTAMP(3),
    "skipReason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsCandidate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NewsCandidate_runId_createdAt_idx" ON "NewsCandidate"("runId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "NewsCandidate_supplierKey_createdAt_idx" ON "NewsCandidate"("supplierKey", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "NewsCandidate_skipReason_createdAt_idx" ON "NewsCandidate"("skipReason", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "NewsCandidate_createdAt_idx" ON "NewsCandidate"("createdAt");

DO $$ BEGIN
  ALTER TABLE "NewsCandidate" ADD CONSTRAINT "NewsCandidate_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "NewsRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierAlert" ADD COLUMN "summarySource" TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierAlert" ADD COLUMN "summaryError" TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierAlert" ADD COLUMN "emailStatus" TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierAlert" ADD COLUMN "emailError" TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;
