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
  runId?: string | null;
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
  summarySource?: string | null;
  summaryError?: string | null;
  emailStatus?: string | null;
  emailError?: string | null;
  sentAt: Date | null;
  news: StoredAlertNews | null;
}

export type NewsSkipReason = "no_keyword" | "cap" | "bad_url" | "dup_hash" | "dup_title";

export type SummarySource = "perplexity" | "fallback" | "reused";

export interface NewsRunError {
  scope: string;
  message: string;
  supplierKey?: string;
}

export interface NewsRunFinish {
  status: "ok" | "failed";
  finishedAt: Date;
  supplierKeys: number;
  fetched: number;
  keywordHits: number;
  inserted: number;
  skipped: number;
  classified: number;
  unclassified: number;
  alerts: number;
  emails: number;
  purged: number;
  errors: NewsRunError[];
}

export interface NewsCandidateInsert {
  runId: string | null;
  supplierKey: string;
  title: string;
  url: string;
  feed: string | null;
  source: string | null;
  publishedAt: Date | null;
  skipReason: NewsSkipReason;
}

export interface JevCallInsert {
  runId: string | null;
  newsItemId: string | null;
  requestBody: unknown;
  httpStatus: number | null;
  ok: boolean;
  reason: string | null;
  message: string | null;
  p: number | null;
  band: string | null;
  model: string | null;
  promptVersion: string | null;
  latencyMs: number | null;
  attempt: number;
  responseRaw: unknown;
}

export interface NewsAuditSink {
  startRun(startedAt: Date): Promise<string>;
  finishRun(id: string, data: NewsRunFinish): Promise<void>;
  insertCandidates(rows: NewsCandidateInsert[]): Promise<void>;
  insertJevCall(row: JevCallInsert): Promise<void>;
  purge(cutoff: Date): Promise<number>;
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
    summarySource?: string | null;
    summaryError?: string | null;
  }): Promise<StoredAlert>;
  markAlertsSent(ids: string[], sentAt: Date): Promise<void>;
  markAlertsEmailFailed(ids: string[], message: string): Promise<void>;
  purge(cutoff: Date): Promise<number>;
}
