import type { Prisma } from "@prisma/client";

export const NEWS_EXPORT_LIMIT = 5000;

export const NEWS_CSV_COLUMNS = [
  "id",
  "runId",
  "supplierKey",
  "title",
  "url",
  "feed",
  "source",
  "publishedAt",
  "fetchedAt",
  "status",
  "jevP",
  "band",
  "jevOk",
  "jevReason",
  "latencyMs",
  "alertCreated",
  "emailSent",
  "emailStatus",
] as const;

export type NewsCsvColumn = (typeof NEWS_CSV_COLUMNS)[number];

export interface NewsCsvRow {
  id: string;
  runId: string | null;
  supplierKey: string;
  title: string;
  url: string;
  feed: string | null;
  source: string | null;
  publishedAt: Date | string | null;
  fetchedAt: Date | string | null;
  status: string;
  jevP: number | null;
  band: string | null;
  jevOk: boolean | null;
  jevReason: string | null;
  latencyMs: number | null;
  alertCreated: boolean;
  emailSent: boolean;
  emailStatus: string | null;
}

export interface NewsListFilters {
  runId?: string;
  supplier?: string;
  status?: string;
  pMin?: number;
  pMax?: number;
  from?: Date;
  to?: Date;
  sentToJev?: "yes" | "no";
  cursor?: { at: Date; id: string } | null;
}

export interface SkippedListFilters {
  runId?: string;
  supplier?: string;
  skipReason?: string;
  from?: Date;
  to?: Date;
  cursor?: { at: Date; id: string } | null;
}

export function encodeNewsCursor(at: Date, id: string): string {
  return `${at.toISOString()}_${id}`;
}

export function parseNewsCursor(cursor: string | null | undefined): { at: Date; id: string } | null {
  if (!cursor) return null;
  const sep = cursor.indexOf("_");
  if (sep <= 0) return null;
  const at = new Date(cursor.slice(0, sep));
  const id = cursor.slice(sep + 1);
  if (Number.isNaN(at.getTime()) || !id) return null;
  return { at, id };
}

export function sentToJevWhere(value: "yes" | "no"): Prisma.NewsItemWhereInput {
  const sent: Prisma.NewsItemWhereInput = {
    OR: [
      { jevCalls: { some: {} } },
      { jevP: { not: null } },
      { promptVersion: { not: null } },
      { model: { not: null } },
    ],
  };
  return value === "yes" ? sent : { NOT: sent };
}

export function newsItemWhere(filters: NewsListFilters): Prisma.NewsItemWhereInput {
  const and: Prisma.NewsItemWhereInput[] = [];
  if (filters.runId) {
    and.push({
      OR: [{ runId: filters.runId }, { jevCalls: { some: { runId: filters.runId } } }],
    });
  }
  if (filters.supplier) {
    and.push({ supplierKey: { contains: filters.supplier, mode: "insensitive" } });
  }
  if (filters.status) and.push({ status: filters.status });
  if (filters.pMin != null || filters.pMax != null) {
    const jevP: Prisma.FloatNullableFilter = {};
    if (filters.pMin != null) jevP.gte = filters.pMin;
    if (filters.pMax != null) jevP.lte = filters.pMax;
    and.push({ jevP });
  }
  if (filters.from || filters.to) {
    const fetchedAt: Prisma.DateTimeFilter = {};
    if (filters.from) fetchedAt.gte = filters.from;
    if (filters.to) fetchedAt.lt = filters.to;
    and.push({ fetchedAt });
  }
  if (filters.sentToJev) and.push(sentToJevWhere(filters.sentToJev));
  if (filters.cursor) {
    and.push({
      OR: [
        { fetchedAt: { lt: filters.cursor.at } },
        { fetchedAt: filters.cursor.at, id: { lt: filters.cursor.id } },
      ],
    });
  }
  return and.length === 0 ? {} : { AND: and };
}

export function newsCandidateWhere(filters: SkippedListFilters): Prisma.NewsCandidateWhereInput {
  const and: Prisma.NewsCandidateWhereInput[] = [];
  if (filters.runId) and.push({ runId: filters.runId });
  if (filters.supplier) {
    and.push({ supplierKey: { contains: filters.supplier, mode: "insensitive" } });
  }
  if (filters.skipReason) and.push({ skipReason: filters.skipReason });
  if (filters.from || filters.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.from) createdAt.gte = filters.from;
    if (filters.to) createdAt.lt = filters.to;
    and.push({ createdAt });
  }
  if (filters.cursor) {
    and.push({
      OR: [
        { createdAt: { lt: filters.cursor.at } },
        { createdAt: filters.cursor.at, id: { lt: filters.cursor.id } },
      ],
    });
  }
  return and.length === 0 ? {} : { AND: and };
}

function csvCell(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return csvCell(value.toISOString());
  if (typeof value === "boolean") return value ? "yes" : "no";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function newsItemsToCsv(rows: NewsCsvRow[]): string {
  const lines = [NEWS_CSV_COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(NEWS_CSV_COLUMNS.map((column) => csvCell(row[column])).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function feedFromRaw(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || !("feed" in raw)) return null;
  const feed = (raw as { feed?: unknown }).feed;
  return typeof feed === "string" && feed.trim() ? feed : null;
}
