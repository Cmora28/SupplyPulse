import { Prisma, type PrismaClient } from "@prisma/client";
import { capAuditJson } from "@/lib/jev";
import type { JevCallInsert, NewsAuditSink, NewsCandidateInsert, NewsRunFinish } from "@/lib/daily-news-types";

function asJson(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) return {};
  try {
    const encoded = JSON.stringify(value);
    if (!encoded) return {};
    return JSON.parse(encoded) as Prisma.InputJsonValue;
  } catch {
    return { unserializable: true };
  }
}

function asNullableJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (value === undefined || value === null) return Prisma.DbNull;
  return asJson(capAuditJson(value));
}

export function createPrismaNewsAudit(prisma: PrismaClient): NewsAuditSink {
  return {
    async startRun(startedAt: Date): Promise<string> {
      const row = await prisma.newsRun.create({
        data: { startedAt, status: "running" },
        select: { id: true },
      });
      return row.id;
    },

    async finishRun(id: string, data: NewsRunFinish): Promise<void> {
      await prisma.newsRun.update({
        where: { id },
        data: {
          status: data.status,
          finishedAt: data.finishedAt,
          supplierKeys: data.supplierKeys,
          fetched: data.fetched,
          keywordHits: data.keywordHits,
          inserted: data.inserted,
          skipped: data.skipped,
          classified: data.classified,
          unclassified: data.unclassified,
          alerts: data.alerts,
          emails: data.emails,
          purged: data.purged,
          errors: asJson(data.errors),
        },
      });
    },

    async insertCandidates(rows: NewsCandidateInsert[]): Promise<void> {
      if (rows.length === 0) return;
      await prisma.newsCandidate.createMany({
        data: rows.map((row) => ({
          runId: row.runId,
          supplierKey: row.supplierKey,
          title: row.title.slice(0, 500),
          url: row.url.slice(0, 4000),
          feed: row.feed,
          source: row.source,
          publishedAt: row.publishedAt,
          skipReason: row.skipReason,
        })),
      });
    },

    async insertJevCall(row: JevCallInsert): Promise<void> {
      await prisma.jevCall.create({
        data: {
          runId: row.runId,
          newsItemId: row.newsItemId,
          requestBody: asJson(capAuditJson(row.requestBody)),
          httpStatus: row.httpStatus,
          ok: row.ok,
          reason: row.reason,
          message: row.message ? row.message.slice(0, 2000) : null,
          p: row.p,
          band: row.band,
          model: row.model,
          promptVersion: row.promptVersion,
          latencyMs: row.latencyMs,
          attempt: row.attempt,
          responseRaw: asNullableJson(row.responseRaw),
        },
      });
    },

    async purge(cutoff: Date): Promise<number> {
      const runs = await prisma.newsRun.deleteMany({
        where: { startedAt: { lt: cutoff } },
      });
      const calls = await prisma.jevCall.deleteMany({
        where: { runId: null, createdAt: { lt: cutoff } },
      });
      const candidates = await prisma.newsCandidate.deleteMany({
        where: { runId: null, createdAt: { lt: cutoff } },
      });
      return runs.count + calls.count + candidates.count;
    },
  };
}
