import type { Prisma } from "@prisma/client";

/** Rows at or above this JEV score are kept. Sent alerts are kept via FK. */
export const NEWS_RETENTION_KEEP_SCORE = 0.6;
export const NEWS_RETENTION_DAYS = 90;
export const NEWS_PURGE_BATCH = 10_000;

export function retentionCutoff(now: Date): Date {
  return new Date(now.getTime() - NEWS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * True when the daily job should delete the row.
 * Unclassified rows (null score) follow the same 90-day schedule as scores
 * below 0.6. A linked SupplierAlert is never deleted by this rule.
 */
export function newsItemExpires(
  item: { fetchedAt: Date; jevP: number | null; hasAlert: boolean },
  now: Date
): boolean {
  if (item.hasAlert) return false;
  if (item.fetchedAt.getTime() >= retentionCutoff(now).getTime()) return false;
  if (item.jevP !== null && item.jevP >= NEWS_RETENTION_KEEP_SCORE) return false;
  return true;
}

export function staleNewsWhere(cutoff: Date): Prisma.NewsItemWhereInput {
  return {
    fetchedAt: { lt: cutoff },
    alerts: { none: {} },
    OR: [{ jevP: null }, { jevP: { lt: NEWS_RETENTION_KEEP_SCORE } }],
  };
}
