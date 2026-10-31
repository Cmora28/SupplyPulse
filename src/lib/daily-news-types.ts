import type { SubscriptionTier } from "@prisma/client";

export interface MonitoredSupplier {
  id: string;
  name: string;
  country: string;
  category: string;
  userId: string;
  email: string;
  userName: string;
  locale: string;
  subscriptionTier: SubscriptionTier;
  emailNotifications: boolean;
  reportDay: number;
}

export interface NewsInsert {
  supplierKey: string;
  urlHash: string;
  title: string;
  url: string;
  source: string | null;
  publishedAt: Date;
  raw: {
    title: string;
    link: string;
    published: string;
    description: string;
    source: string;
    feed: string;
  };
}

export interface StoredNewsItem {
  id: string;
  supplierKey: string;
  urlHash: string;
  title: string;
  url: string;
  source: string | null;
  publishedAt: Date;
  fetchedAt: Date;
  raw: unknown;
  jevP: number | null;
  promptVersion: string | null;
  model: string | null;
  status: string;
}

export interface ClassificationUpdate {
  jevP: number | null;
  promptVersion: string | null;
  model: string | null;
  status: string;
}

export interface StoredAlertNews {
  title: string;
  url: string;
  source: string | null;
  jevP: number | null;
  supplierKey: string;
}

export interface StoredAlert {
  id: string;
  newsItemId: string;
  supplierId: string;
  severity: string;
  summary: string;
  sentAt: Date | null;
  news: StoredAlertNews | null;
}

export interface DailyNewsStore {
  listSuppliers(): Promise<MonitoredSupplier[]>;
  findUrlHashes(supplierKey: string, hashes: string[]): Promise<string[]>;
  findRecentTitles(supplierKey: string, since: Date): Promise<string[]>;
  insertNewsItems(rows: NewsInsert[]): Promise<void>;
  listPendingClassification(supplierKey: string, limit: number): Promise<StoredNewsItem[]>;
  saveClassification(id: string, data: ClassificationUpdate): Promise<void>;
  listEscalations(supplierKeys: string[], since: Date): Promise<StoredNewsItem[]>;
  listAlertsForSuppliers(supplierIds: string[]): Promise<StoredAlert[]>;
  findReusableSummary(newsItemId: string): Promise<string | null>;
  createAlert(row: {
    newsItemId: string;
    supplierId: string;
    severity: string;
    summary: string;
  }): Promise<StoredAlert>;
  markAlertsSent(ids: string[], sentAt: Date): Promise<void>;
  purge(cutoff: Date): Promise<number>;
}
