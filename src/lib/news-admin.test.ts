import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { STARTUP_SQL_FILES } from "./apply-sql";
import {
  newsCandidateWhere,
  newsItemWhere,
  newsItemsToCsv,
  sentToJevWhere,
  type NewsCsvRow,
} from "./news-admin";

describe("news admin query", () => {
  it("filters items by run, score, and whether a JEV call exists", () => {
    const where = newsItemWhere({
      runId: "run-1",
      supplier: "maersk",
      status: "escalate",
      pMin: 0.6,
      pMax: 1,
      sentToJev: "yes",
      from: new Date("2026-10-01T00:00:00.000Z"),
      to: new Date("2026-10-31T00:00:00.000Z"),
    });
    assert.deepEqual(where, {
      AND: [
        { OR: [{ runId: "run-1" }, { jevCalls: { some: { runId: "run-1" } } }] },
        { supplierKey: { contains: "maersk", mode: "insensitive" } },
        { status: "escalate" },
        { jevP: { gte: 0.6, lte: 1 } },
        {
          fetchedAt: {
            gte: new Date("2026-10-01T00:00:00.000Z"),
            lt: new Date("2026-10-31T00:00:00.000Z"),
          },
        },
        sentToJevWhere("yes"),
      ],
    });
    assert.deepEqual(newsItemWhere({ sentToJev: "no" }), { AND: [sentToJevWhere("no")] });
  });

  it("filters skipped candidates by reason", () => {
    assert.deepEqual(newsCandidateWhere({ skipReason: "dup_hash", supplier: "bosch" }), {
      AND: [
        { supplierKey: { contains: "bosch", mode: "insensitive" } },
        { skipReason: "dup_hash" },
      ],
    });
  });

  it("escapes CSV cells that could be interpreted as formulas", () => {
    const row: NewsCsvRow = {
      id: "n1",
      runId: "r1",
      supplierKey: "maersk|DK",
      title: '=HYPERLINK("http://evil")',
      url: "https://example.com/a,b",
      feed: "google-news",
      source: 'Reuters "wire"',
      publishedAt: new Date("2026-10-30T12:00:00.000Z"),
      fetchedAt: new Date("2026-10-31T06:00:00.000Z"),
      status: "escalate",
      jevP: 0.91,
      band: "escalate",
      jevOk: true,
      jevReason: null,
      latencyMs: 40,
      alertCreated: true,
      emailSent: false,
      emailStatus: "failed",
    };
    const csv = newsItemsToCsv([row]);
    assert.match(csv, /"'=HYPERLINK/);
    assert.match(csv, /"https:\/\/example.com\/a,b"/);
    assert.match(csv, /"Reuters ""wire"""/);
    assert.match(csv, /,yes,no,failed/);
  });
});

describe("news audit SQL", () => {
  it("applies the news tables before the audit script and keeps purge foreign keys safe", () => {
    assert.equal(STARTUP_SQL_FILES[0].includes("news_items_supplier_alerts"), true);
    assert.equal(STARTUP_SQL_FILES[1].includes("news_pipeline_audit"), true);
    assert.equal(STARTUP_SQL_FILES[2].includes("user_is_admin"), true);
    const sql = readFileSync(new URL("../../prisma/sql/20261031_news_pipeline_audit.sql", import.meta.url), "utf8");
    assert.match(sql, /CREATE TABLE IF NOT EXISTS "NewsRun"/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS "JevCall"/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS "NewsCandidate"/);
    assert.match(sql, /JevCall_newsItemId_fkey[\s\S]*ON DELETE SET NULL/);
    assert.match(sql, /JevCall_runId_fkey[\s\S]*ON DELETE CASCADE/);
    assert.match(sql, /NewsItem_runId_fkey[\s\S]*ON DELETE SET NULL/);
    assert.match(sql, /ADD COLUMN "summarySource"/);
    assert.match(sql, /ADD COLUMN "emailStatus"/);
  });
});
