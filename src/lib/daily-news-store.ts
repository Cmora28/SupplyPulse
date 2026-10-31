import { Prisma, PrismaClient } from "@prisma/client";
import type { NewsItem, SupplierAlert } from "@prisma/client";
import { JEV_ESCALATE_MIN } from "@/lib/collected-signals";
import { NEWS_PURGE_BATCH, staleNewsWhere } from "@/lib/news-retention";
import { normalizeTitleForDedupe } from "@/lib/supplier-key";
import type {
  ClassificationUpdate,
  DailyNewsStore,
  MonitoredSupplier,
  NewsInsert,
  StoredAlert,
  StoredNewsItem,
} from "@/lib/daily-news-types";

function mapNews(row: NewsItem): StoredNewsItem {
  return {
    id: row.id,
    supplierKey: row.supplierKey,
    urlHash: row.urlHash.trim(),
    title: row.title,
    url: row.url,
    source: row.source,
    publishedAt: row.publishedAt,
    fetchedAt: row.fetchedAt,
    raw: row.raw,
    jevP: row.jevP,
    promptVersion: row.promptVersion,
    model: row.model,
    status: row.status,
  };
}

function mapAlert(row: SupplierAlert & { newsItem?: NewsItem | null }): StoredAlert {
  const news = row.newsItem
    ? {
        title: row.newsItem.title,
        url: row.newsItem.url,
        source: row.newsItem.source,
        jevP: row.newsItem.jevP,
        supplierKey: row.newsItem.supplierKey,
      }
    : null;
  return {
    id: row.id,
    newsItemId: row.newsItemId,
    supplierId: row.supplierId,
    severity: row.severity,
    summary: row.summary,
    summarySource: row.summarySource,
    summaryError: row.summaryError,
    emailStatus: row.emailStatus,
    emailError: row.emailError,
    sentAt: row.sentAt,
    news,
  };
}

export function createPrismaDailyNewsStore(prisma: PrismaClient): DailyNewsStore {
  return {
    async listSuppliers(): Promise<MonitoredSupplier[]> {
      const rows = await prisma.supplier.findMany({
        select: {
          id: true,
          name: true,
          country: true,
          category: true,
          userId: true,
          user: {
            select: {
              email: true,
              name: true,
              locale: true,
              subscriptionTier: true,
              emailNotifications: true,
              reportDay: true,
            },
          },
        },
      });
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        country: row.country,
        category: row.category,
        userId: row.userId,
        email: row.user.email,
        userName: row.user.name,
        locale: row.user.locale,
        subscriptionTier: row.user.subscriptionTier,
        emailNotifications: row.user.emailNotifications,
        reportDay: row.user.reportDay,
      }));
    },

    async findUrlHashes(supplierKey: string, hashes: string[]): Promise<string[]> {
      if (hashes.length === 0) return [];
      const rows = await prisma.newsItem.findMany({
        where: { supplierKey, urlHash: { in: hashes } },
        select: { urlHash: true },
      });
      return rows.map((row) => row.urlHash.trim());
    },

    async findRecentTitles(supplierKey: string, since: Date): Promise<string[]> {
      const rows = await prisma.newsItem.findMany({
        where: { supplierKey, fetchedAt: { gte: since } },
        select: { title: true },
      });
      return rows.map((row) => normalizeTitleForDedupe(row.title));
    },

    async insertNewsItems(rows: NewsInsert[]): Promise<void> {
      if (rows.length === 0) return;
      await prisma.newsItem.createMany({
        data: rows.map((row) => ({
          supplierKey: row.supplierKey,
          urlHash: row.urlHash,
          title: row.title,
          url: row.url,
          source: row.source,
          publishedAt: row.publishedAt,
          raw: row.raw,
          runId: row.runId ?? null,
          status: "new",
        })),
        skipDuplicates: true,
      });
    },

    async listPendingClassification(supplierKey: string, limit: number): Promise<StoredNewsItem[]> {
      const rows = await prisma.newsItem.findMany({
        where: {
          supplierKey,
          jevP: null,
          status: { in: ["new", "unclassified"] },
        },
        orderBy: { fetchedAt: "desc" },
        take: limit,
      });
      return rows.map(mapNews);
    },

    async saveClassification(id: string, data: ClassificationUpdate): Promise<void> {
      await prisma.newsItem.update({
        where: { id },
        data: {
          jevP: data.jevP,
          promptVersion: data.promptVersion,
          model: data.model,
          status: data.status,
        },
      });
    },

    async listEscalations(supplierKeys: string[], since: Date): Promise<StoredNewsItem[]> {
      if (supplierKeys.length === 0) return [];
      const rows = await prisma.newsItem.findMany({
        where: {
          supplierKey: { in: supplierKeys },
          status: "escalate",
          jevP: { gte: JEV_ESCALATE_MIN },
          fetchedAt: { gte: since },
        },
        orderBy: { jevP: "desc" },
      });
      return rows.map(mapNews);
    },

    async listAlertsForSuppliers(supplierIds: string[]): Promise<StoredAlert[]> {
      if (supplierIds.length === 0) return [];
      const rows = await prisma.supplierAlert.findMany({
        where: { supplierId: { in: supplierIds } },
        include: { newsItem: true },
      });
      return rows.map(mapAlert);
    },

    async findReusableSummary(newsItemId: string): Promise<string | null> {
      const row = await prisma.supplierAlert.findFirst({
        where: { newsItemId, summary: { not: "" } },
        select: { summary: true },
        orderBy: { createdAt: "asc" },
      });
      return row?.summary ?? null;
    },

    async createAlert(row): Promise<StoredAlert> {
      try {
        const created = await prisma.supplierAlert.create({
          data: {
            newsItemId: row.newsItemId,
            supplierId: row.supplierId,
            severity: row.severity,
            summary: row.summary,
            summarySource: row.summarySource ?? null,
            summaryError: row.summaryError ?? null,
            emailStatus: "pending",
          },
          include: { newsItem: true },
        });
        return mapAlert(created);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          const existing = await prisma.supplierAlert.findUnique({
            where: {
              newsItemId_supplierId: {
                newsItemId: row.newsItemId,
                supplierId: row.supplierId,
              },
            },
            include: { newsItem: true },
          });
          if (existing) return mapAlert(existing);
        }
        throw error;
      }
    },

    async markAlertsSent(ids: string[], sentAt: Date): Promise<void> {
      if (ids.length === 0) return;
      await prisma.supplierAlert.updateMany({
        where: { id: { in: ids } },
        data: { sentAt, emailStatus: "sent", emailError: null },
      });
    },

    async markAlertsEmailFailed(ids: string[], message: string): Promise<void> {
      if (ids.length === 0) return;
      await prisma.supplierAlert.updateMany({
        where: { id: { in: ids } },
        data: { emailStatus: "failed", emailError: message.slice(0, 2000) },
      });
    },

    async purge(cutoff: Date): Promise<number> {
      let deleted = 0;
      let batch = NEWS_PURGE_BATCH;
      while (batch === NEWS_PURGE_BATCH) {
        const rows = await prisma.newsItem.findMany({
          where: staleNewsWhere(cutoff),
          select: { id: true },
          take: NEWS_PURGE_BATCH,
        });
        if (rows.length === 0) break;
        const result = await prisma.newsItem.deleteMany({
          where: { id: { in: rows.map((row) => row.id) } },
        });
        deleted += result.count;
        batch = rows.length;
      }
      return deleted;
    },
  };
}
