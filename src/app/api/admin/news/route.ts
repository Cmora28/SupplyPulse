import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  NEWS_EXPORT_LIMIT,
  encodeNewsCursor,
  feedFromRaw,
  newsCandidateWhere,
  newsItemWhere,
  newsItemsToCsv,
  parseNewsCursor,
  type NewsCsvRow,
} from "@/lib/news-admin";
import { ADMIN_EMAIL, rateLimitAsync } from "@/lib/security";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  view: z.enum(["runs", "items", "skipped", "csv"]).optional(),
  runId: z.string().trim().max(64).optional(),
  supplier: z.string().trim().max(200).optional(),
  status: z.string().trim().max(40).optional(),
  skipReason: z.enum(["no_keyword", "cap", "bad_url", "dup_hash", "dup_title"]).optional(),
  pMin: z.coerce.number().min(0).max(1).optional(),
  pMax: z.coerce.number().min(0).max(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sentToJev: z.enum(["yes", "no"]).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const listSelect = {
  id: true,
  runId: true,
  supplierKey: true,
  title: true,
  url: true,
  source: true,
  publishedAt: true,
  fetchedAt: true,
  raw: true,
  jevP: true,
  status: true,
  promptVersion: true,
  model: true,
  jevCalls: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      ok: true,
      reason: true,
      httpStatus: true,
      p: true,
      band: true,
      latencyMs: true,
      attempt: true,
    },
  },
  alerts: {
    select: {
      id: true,
      sentAt: true,
      emailStatus: true,
      createdAt: true,
      summarySource: true,
    },
  },
};

type ListedItem = {
  id: string;
  runId: string | null;
  supplierKey: string;
  title: string;
  url: string;
  source: string | null;
  publishedAt: Date;
  fetchedAt: Date;
  raw: unknown;
  jevP: number | null;
  status: string;
  jevCalls: Array<{
    ok: boolean;
    reason: string | null;
    httpStatus: number | null;
    p: number | null;
    band: string | null;
    latencyMs: number | null;
    attempt: number;
  }>;
  alerts: Array<{
    id: string;
    sentAt: Date | null;
    emailStatus: string | null;
    createdAt: Date;
    summarySource: string | null;
  }>;
};

function mapItem(row: ListedItem): NewsCsvRow {
  const call = row.jevCalls[0] ?? null;
  const emailSent = row.alerts.some((alert) => alert.sentAt != null || alert.emailStatus === "sent");
  return {
    id: row.id,
    runId: row.runId,
    supplierKey: row.supplierKey,
    title: row.title,
    url: row.url,
    feed: feedFromRaw(row.raw),
    source: row.source,
    publishedAt: row.publishedAt,
    fetchedAt: row.fetchedAt,
    status: row.status,
    jevP: row.jevP,
    band: call?.band ?? (row.jevP != null ? row.status : null),
    jevOk: call ? call.ok : null,
    jevReason: call?.reason ?? null,
    latencyMs: call?.latencyMs ?? null,
    alertCreated: row.alerts.length > 0,
    emailSent,
    emailStatus:
      row.alerts.find((alert) => alert.emailStatus)?.emailStatus ?? (emailSent ? "sent" : null),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await rateLimitAsync(`admin:news:${session.user.id}`, 60, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) },
        }
      );
    }

    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid query" },
        { status: 400 }
      );
    }

    const {
      view = "runs",
      runId,
      supplier,
      status,
      skipReason,
      pMin,
      pMax,
      from,
      to,
      sentToJev,
      cursor,
      limit = 25,
    } = parsed.data;
    const cursorParsed = parseNewsCursor(cursor);
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    if (view === "runs") {
      const items = await prisma.newsRun.findMany({
        where: cursorParsed
          ? {
              OR: [
                { startedAt: { lt: cursorParsed.at } },
                { startedAt: cursorParsed.at, id: { lt: cursorParsed.id } },
              ],
            }
          : undefined,
        orderBy: [{ startedAt: "desc" }, { id: "desc" }],
        take: limit + 1,
      });
      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;
      const last = page[page.length - 1];
      return NextResponse.json({
        items: page,
        nextCursor: hasMore && last ? encodeNewsCursor(last.startedAt, last.id) : null,
      });
    }

    if (view === "skipped") {
      const where = newsCandidateWhere({
        runId: runId || undefined,
        supplier: supplier || undefined,
        skipReason,
        from: fromDate,
        to: toDate,
        cursor: cursorParsed,
      });
      const items = await prisma.newsCandidate.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
      });
      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;
      const last = page[page.length - 1];
      return NextResponse.json({
        items: page,
        nextCursor: hasMore && last ? encodeNewsCursor(last.createdAt, last.id) : null,
      });
    }

    const where = newsItemWhere({
      runId: runId || undefined,
      supplier: supplier || undefined,
      status: status || undefined,
      pMin,
      pMax,
      from: fromDate,
      to: toDate,
      sentToJev,
      cursor: view === "csv" ? null : cursorParsed,
    });
    const take = view === "csv" ? NEWS_EXPORT_LIMIT : limit + 1;
    const rows = (await prisma.newsItem.findMany({
      where,
      orderBy: [{ fetchedAt: "desc" }, { id: "desc" }],
      take,
      select: listSelect,
    })) as ListedItem[];

    if (view === "csv") {
      const csv = newsItemsToCsv(rows.map(mapItem));
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="news-audit.csv"',
        },
      });
    }

    const hasMore = rows.length > limit;
    const page = (hasMore ? rows.slice(0, limit) : rows).map(mapItem);
    const last = page[page.length - 1];
    const lastFetched = last?.fetchedAt ? new Date(last.fetchedAt) : null;
    return NextResponse.json({
      items: page,
      nextCursor:
        hasMore && last && lastFetched ? encodeNewsCursor(lastFetched, last.id) : null,
    });
  } catch (error) {
    console.error("Admin news fetch error:", error);
    return NextResponse.json({ error: "Failed to load news audit" }, { status: 500 });
  }
}
