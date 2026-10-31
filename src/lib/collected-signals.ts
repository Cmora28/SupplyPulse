import type { PrismaClient } from "@prisma/client";
import { supplierKey } from "@/lib/supplier-key";

export const JEV_WATCH_MIN = 0.2;
export const JEV_ESCALATE_MIN = 0.6;

export type JevBand = "ignored" | "watch" | "escalate";

export function classifyJevScore(p: number): JevBand {
  if (p < JEV_WATCH_MIN) return "ignored";
  if (p < JEV_ESCALATE_MIN) return "watch";
  return "escalate";
}

export interface CollectedSignal {
  title: string;
  source: string | null;
  url: string;
  publishedAt: Date;
  jevP: number;
}

/**
 * Appends pre-collected items to the weekly prompt. An empty list (or only
 * ignored scores) returns the original prompt unchanged.
 */
export function appendCollectedSignals(prompt: string, signals: CollectedSignal[]): string {
  const relevant = signals.filter((signal) => signal.jevP >= JEV_WATCH_MIN);
  if (relevant.length === 0) return prompt;

  const lines = relevant
    .slice()
    .sort((a, b) => b.jevP - a.jevP)
    .map((signal) => {
      const date = signal.publishedAt.toISOString().slice(0, 10);
      const source = signal.source ? ` (${signal.source})` : "";
      const band = signal.jevP >= JEV_ESCALATE_MIN ? "escalate" : "watch";
      return `- [${signal.jevP.toFixed(2)} ${band}] ${date} — ${signal.title}${source} ${signal.url}`;
    });

  return `${prompt}

---

## Pre-collected public signals (this week)

The following items were collected from Google News RSS and GDELT and scored by a fixed disruption classifier (0-1 probability that the item describes a material delivery disruption within 30 days). Treat scores of 0.60 or higher as priority to verify in Confirmed Risks or Watch Signals. Do not ignore them. Do not treat a score alone as confirmation — confirm with the cited URL. Do not invent items that are not in this list or in your own search.

${lines.join("\n")}
`;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function loadWeeklySignals(
  prisma: PrismaClient,
  supplier: { name: string; country: string },
  now: Date = new Date()
): Promise<CollectedSignal[]> {
  const key = supplierKey(supplier.name, supplier.country);
  const since = new Date(now.getTime() - WEEK_MS);
  const rows = await prisma.newsItem.findMany({
    where: {
      supplierKey: key,
      jevP: { gte: JEV_WATCH_MIN },
      OR: [{ publishedAt: { gte: since } }, { fetchedAt: { gte: since } }],
    },
    orderBy: { jevP: "desc" },
    take: 15,
  });

  return rows.flatMap((row) => {
    if (row.jevP === null) return [];
    return [
      {
        title: row.title,
        source: row.source,
        url: row.url,
        publishedAt: row.publishedAt,
        jevP: row.jevP,
      },
    ];
  });
}
