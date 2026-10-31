import { JEV_ESCALATE_MIN } from "@/lib/collected-signals";
import type { JevClassifyResult, JevNewsState } from "@/lib/jev";
import { buildJevRequestBody, classifyWithJev } from "@/lib/jev";
import { fetchSupplierNews } from "@/lib/news-feeds";
import { newsUrlHash, normalizeNewsUrl } from "@/lib/news-url";
import { retentionCutoff } from "@/lib/news-retention";
import { matchesRiskKeyword } from "@/lib/risk-keywords";
import { normalizeTitleForDedupe, supplierKey } from "@/lib/supplier-key";
import { isInterimAlertDay, TIER_ALERT_CADENCE } from "@/lib/tier-limits";
import type {
  DailyNewsStore,
  JevCallInsert,
  MonitoredSupplier,
  NewsAuditSink,
  NewsCandidateInsert,
  NewsRunError,
  NewsSkipReason,
  StoredNewsItem,
  SummarySource,
} from "@/lib/daily-news-types";
import { generateDisruptionAlert } from "@/lib/perplexity";

export const KEYWORD_CAP = 20;
const CLASSIFY_CAP = 20;
const SUMMARY_CAP = 25;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const POOL = 3;

export interface AlertEmailItem {
  supplierName: string;
  summary: string;
  title: string;
  url: string;
  source: string | null;
  jevP: number;
}

export interface DailyNewsDeps {
  store: DailyNewsStore;
  audit?: NewsAuditSink;
  fetchImpl?: typeof fetch;
  now?: Date;
  classify?: (input: JevNewsState) => Promise<JevClassifyResult>;
  summarize?: (input: {
    supplierName: string;
    country: string;
    category: string;
    title: string;
    source: string | null;
    url: string;
    publishedAt: string;
    jevP: number;
  }) => Promise<string>;
  sendEmail?: (input: {
    to: string;
    name: string;
    locale: string;
    items: AlertEmailItem[];
  }) => Promise<void>;
  logger?: (message: string) => void;
}

export interface DailyNewsResult {
  runId: string | null;
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

interface SummaryOutcome {
  summary: string;
  summarySource: SummarySource;
  summaryError: string | null;
}

export function fallbackAlertSummary(item: {
  title: string;
  source: string | null;
  url: string;
  jevP: number;
}): string {
  const source = item.source ? ` (${item.source})` : "";
  return `Possible supply disruption (score ${item.jevP.toFixed(2)}): ${item.title}${source}. Source: ${item.url}`;
}

function publishedLabel(row: StoredNewsItem): string {
  if (row.raw && typeof row.raw === "object" && "published" in row.raw) {
    const published = (row.raw as { published?: unknown }).published;
    if (typeof published === "string" && published.trim()) return published;
  }
  return row.publishedAt.toUTCString();
}

async function auditStep(
  log: (message: string) => void,
  label: string,
  fn: () => Promise<void>
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Audit ${label} failed: ${message}`);
  }
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  if (items.length === 0) return;
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const current = index;
      index += 1;
      if (current >= items.length) return;
      await fn(items[current]);
    }
  });
  await Promise.all(workers);
}

function groupSuppliers(suppliers: MonitoredSupplier[]): MonitoredSupplier[][] {
  const groups = new Map<string, MonitoredSupplier[]>();
  for (const supplier of suppliers) {
    const key = supplierKey(supplier.name, supplier.country);
    const list = groups.get(key) ?? [];
    list.push(supplier);
    groups.set(key, list);
  }
  return Array.from(groups.values());
}

function requestDocument(state: JevNewsState, provided: unknown): unknown {
  if (provided !== undefined) return provided;
  try {
    return JSON.parse(buildJevRequestBody(state)) as unknown;
  } catch {
    return { raw: buildJevRequestBody(state).slice(0, 8000) };
  }
}

function skippedRow(
  runId: string | null,
  supplierKey: string,
  item: { title: string; url: string; feed: string; source: string | null; publishedAt: Date },
  skipReason: NewsSkipReason
): NewsCandidateInsert {
  return {
    runId,
    supplierKey,
    title: item.title.slice(0, 500),
    url: item.url.slice(0, 4000),
    feed: item.feed,
    source: item.source,
    publishedAt: item.publishedAt,
    skipReason,
  };
}

export async function runDailySupplierNews(deps: DailyNewsDeps): Promise<DailyNewsResult> {
  const now = deps.now ?? new Date();
  const log = deps.logger ?? ((message) => console.log(`[DailyNews] ${message}`));
  const classify = deps.classify ?? ((input: JevNewsState) => classifyWithJev(input));
  const summarize =
    deps.summarize ??
    ((input) =>
      generateDisruptionAlert({
        supplierName: input.supplierName,
        country: input.country,
        category: input.category,
        title: input.title,
        source: input.source,
        url: input.url,
        published: input.publishedAt,
        jevP: input.jevP,
      }));
  const sendEmail =
    deps.sendEmail ??
    (async (input) => {
      const { sendSupplierAlertsEmail } = await import("@/lib/email");
      await sendSupplierAlertsEmail({
        user: { email: input.to, name: input.name },
        locale: input.locale,
        items: input.items,
      });
    });

  const result: DailyNewsResult = {
    runId: null,
    supplierKeys: 0,
    fetched: 0,
    keywordHits: 0,
    inserted: 0,
    skipped: 0,
    classified: 0,
    unclassified: 0,
    alerts: 0,
    emails: 0,
    purged: 0,
    errors: [],
  };

  await auditStep(log, "startRun", async () => {
    if (!deps.audit) return;
    result.runId = await deps.audit.startRun(now);
  });

  let fatal: string | null = null;
  try {
    const suppliers = await deps.store.listSuppliers();
    const groups = groupSuppliers(suppliers);
    result.supplierKeys = groups.length;
    const since = new Date(now.getTime() - WEEK_MS);

    await mapPool(groups, POOL, async (members) => {
      const canonical = members.slice().sort((a, b) => a.id.localeCompare(b.id))[0];
      const key = supplierKey(canonical.name, canonical.country);
      try {
        const stats = await collectSupplierGroup({
          store: deps.store,
          audit: deps.audit,
          runId: result.runId,
          canonical,
          key,
          now,
          since,
          fetchImpl: deps.fetchImpl,
          classify,
          log,
          errors: result.errors,
        });
        result.fetched += stats.fetched;
        result.keywordHits += stats.keywordHits;
        result.inserted += stats.inserted;
        result.skipped += stats.skipped;
        result.classified += stats.classified;
        result.unclassified += stats.unclassified;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push({ scope: "collect", supplierKey: key, message });
        log(`Collection failed for ${key}: ${message}`);
      }
    });

    const dispatched = await dispatchAlerts({
      store: deps.store,
      suppliers,
      now,
      since,
      summarize,
      sendEmail,
      log,
      errors: result.errors,
    });
    result.alerts = dispatched.alerts;
    result.emails = dispatched.emails;

    result.purged = await deps.store.purge(retentionCutoff(now));
    await auditStep(log, "purge", async () => {
      if (!deps.audit) return;
      const removed = await deps.audit.purge(retentionCutoff(now));
      if (removed > 0) log(`Audit retention removed ${removed} row(s)`);
    });
  } catch (error) {
    fatal = error instanceof Error ? error.message : String(error);
    result.errors.push({ scope: "run", message: fatal });
    log(`Daily run failed: ${fatal}`);
  } finally {
    const snapshot = result;
    await auditStep(log, "finishRun", async () => {
      if (!deps.audit || !snapshot.runId) return;
      await deps.audit.finishRun(snapshot.runId, {
        status: fatal ? "failed" : "ok",
        finishedAt: new Date(),
        supplierKeys: snapshot.supplierKeys,
        fetched: snapshot.fetched,
        keywordHits: snapshot.keywordHits,
        inserted: snapshot.inserted,
        skipped: snapshot.skipped,
        classified: snapshot.classified,
        unclassified: snapshot.unclassified,
        alerts: snapshot.alerts,
        emails: snapshot.emails,
        purged: snapshot.purged,
        errors: snapshot.errors,
      });
    });
  }

  log(
    `Done. keys=${result.supplierKeys} fetched=${result.fetched} keywordHits=${result.keywordHits} inserted=${result.inserted} skipped=${result.skipped} classified=${result.classified} unclassified=${result.unclassified} alerts=${result.alerts} emails=${result.emails} purged=${result.purged}`
  );
  if (fatal) throw new Error(fatal);
  return result;
}

async function collectSupplierGroup(input: {
  store: DailyNewsStore;
  audit?: NewsAuditSink;
  runId: string | null;
  canonical: MonitoredSupplier;
  key: string;
  now: Date;
  since: Date;
  fetchImpl?: typeof fetch;
  classify: (state: JevNewsState) => Promise<JevClassifyResult>;
  log: (message: string) => void;
  errors: NewsRunError[];
}): Promise<{
  fetched: number;
  keywordHits: number;
  inserted: number;
  skipped: number;
  classified: number;
  unclassified: number;
}> {
  const fetched = await fetchSupplierNews({
    supplierName: input.canonical.name,
    fetchImpl: input.fetchImpl,
    now: input.now,
    logger: input.log,
  });

  const candidates: Array<{
    title: string;
    url: string;
    hash: string;
    source: string | null;
    publishedAt: Date;
    publishedRaw: string;
    description: string;
    feed: string;
    normalizedTitle: string;
  }> = [];
  const skipped: NewsCandidateInsert[] = [];
  let keywordHits = 0;

  for (const item of fetched) {
    const keyword = matchesRiskKeyword(`${item.title}\n${item.description}`);
    if (!keyword) {
      skipped.push(skippedRow(input.runId, input.key, item, "no_keyword"));
      continue;
    }
    keywordHits += 1;
    if (candidates.length >= KEYWORD_CAP) {
      skipped.push(skippedRow(input.runId, input.key, item, "cap"));
      continue;
    }
    const url = normalizeNewsUrl(item.url);
    const hash = url ? newsUrlHash(url) : null;
    if (!url || !hash) {
      skipped.push(skippedRow(input.runId, input.key, item, "bad_url"));
      continue;
    }
    candidates.push({
      title: item.title,
      url,
      hash,
      source: item.source,
      publishedAt: item.publishedAt,
      publishedRaw: item.publishedRaw,
      description: item.description,
      feed: item.feed,
      normalizedTitle: normalizeTitleForDedupe(item.title),
    });
  }

  const existingHashes = new Set(
    await input.store.findUrlHashes(
      input.key,
      candidates.map((item) => item.hash)
    )
  );
  const recentTitles = new Set(await input.store.findRecentTitles(input.key, input.since));

  const fresh = [];
  for (const item of candidates) {
    if (existingHashes.has(item.hash)) {
      skipped.push(skippedRow(input.runId, input.key, item, "dup_hash"));
      continue;
    }
    if (item.normalizedTitle && recentTitles.has(item.normalizedTitle)) {
      skipped.push(skippedRow(input.runId, input.key, item, "dup_title"));
      continue;
    }
    existingHashes.add(item.hash);
    if (item.normalizedTitle) recentTitles.add(item.normalizedTitle);
    fresh.push(item);
  }

  await auditStep(input.log, "candidates", async () => {
    if (!input.audit) return;
    await input.audit.insertCandidates(skipped);
  });

  await input.store.insertNewsItems(
    fresh.map((item) => ({
      supplierKey: input.key,
      urlHash: item.hash,
      title: item.title,
      url: item.url,
      source: item.source,
      publishedAt: item.publishedAt,
      runId: input.runId,
      raw: {
        title: item.title,
        link: item.url,
        published: item.publishedRaw,
        description: item.description,
        source: item.source ?? "",
        feed: item.feed,
      },
    }))
  );

  const pending = await input.store.listPendingClassification(input.key, CLASSIFY_CAP);
  let classified = 0;
  let unclassified = 0;
  let blocked = false;

  for (const row of pending) {
    if (blocked) {
      if (row.status === "new") {
        await input.store.saveClassification(row.id, {
          jevP: null,
          promptVersion: null,
          model: null,
          status: "unclassified",
        });
        unclassified += 1;
      }
      continue;
    }

    const state: JevNewsState = {
      supplierName: input.canonical.name,
      country: input.canonical.country,
      category: input.canonical.category,
      title: row.title,
      source: row.source ?? "",
      published: publishedLabel(row),
    };
    const jev = await input.classify(state);
    await recordJevCall(input, row.id, state, jev);

    if (!jev.ok) {
      if (jev.reason === "missing_key" || jev.reason === "unauthorized") {
        blocked = true;
        input.errors.push({ scope: "jev", supplierKey: input.key, message: jev.message });
        input.log(`JEV unavailable (${jev.reason}): ${jev.message}`);
      } else {
        input.log(`JEV classify failed for ${input.key}: ${jev.message}`);
      }
      await input.store.saveClassification(row.id, {
        jevP: null,
        promptVersion: null,
        model: null,
        status: "unclassified",
      });
      unclassified += 1;
      continue;
    }

    await input.store.saveClassification(row.id, {
      jevP: jev.p,
      promptVersion: jev.promptVersion,
      model: jev.model,
      status: jev.band,
    });
    classified += 1;
  }

  input.log(
    `${input.key}: fetched=${fetched.length} keywordHits=${keywordHits} new=${fresh.length} classified=${classified}`
  );

  return {
    fetched: fetched.length,
    keywordHits,
    inserted: fresh.length,
    skipped: skipped.length,
    classified,
    unclassified,
  };
}

async function recordJevCall(
  input: {
    audit?: NewsAuditSink;
    runId: string | null;
    log: (message: string) => void;
  },
  newsItemId: string,
  state: JevNewsState,
  result: JevClassifyResult
): Promise<void> {
  await auditStep(input.log, "jevCall", async () => {
    if (!input.audit) return;
    const row: JevCallInsert = {
      runId: input.runId,
      newsItemId,
      requestBody: requestDocument(state, result.requestBody),
      httpStatus: result.httpStatus ?? null,
      ok: result.ok,
      reason: result.ok ? null : result.reason,
      message: result.ok ? null : result.message,
      p: result.ok ? result.p : null,
      band: result.ok ? result.band : null,
      model: result.ok ? result.model : null,
      promptVersion: result.ok ? result.promptVersion : null,
      latencyMs: result.latencyMs ?? null,
      attempt: result.attempt ?? 1,
      responseRaw: result.responseRaw ?? null,
    };
    await input.audit.insertJevCall(row);
  });
}

async function dispatchAlerts(input: {
  store: DailyNewsStore;
  suppliers: MonitoredSupplier[];
  now: Date;
  since: Date;
  summarize: NonNullable<DailyNewsDeps["summarize"]>;
  sendEmail: NonNullable<DailyNewsDeps["sendEmail"]>;
  log: (message: string) => void;
  errors: NewsRunError[];
}): Promise<{ emails: number; alerts: number }> {
  const byUser = new Map<string, MonitoredSupplier[]>();
  for (const supplier of input.suppliers) {
    const list = byUser.get(supplier.userId) ?? [];
    list.push(supplier);
    byUser.set(supplier.userId, list);
  }

  const eligible = Array.from(byUser.values()).filter((members) => {
    const user = members[0];
    return user.emailNotifications && TIER_ALERT_CADENCE[user.subscriptionTier] !== "none";
  });
  if (eligible.length === 0) return { emails: 0, alerts: 0 };

  const supplierIds = eligible.flatMap((members) => members.map((supplier) => supplier.id));
  const keys = Array.from(
    new Set(eligible.flatMap((members) => members.map((supplier) => supplierKey(supplier.name, supplier.country))))
  );
  const escalations = await input.store.listEscalations(keys, input.since);
  const alerts = await input.store.listAlertsForSuppliers(supplierIds);
  const summaryCache = new Map<string, SummaryOutcome>();
  let llmCalls = 0;
  let emails = 0;
  let createdAlerts = 0;

  for (const members of eligible) {
    const user = members[0];
    const sendDay = isInterimAlertDay(user.subscriptionTier, user.reportDay, input.now);
    const queued: Array<{ alertId: string; item: AlertEmailItem }> = [];

    for (const supplier of members) {
      const key = supplierKey(supplier.name, supplier.country);
      const mine = alerts.filter((alert) => alert.supplierId === supplier.id);

      for (const alert of mine) {
        if (alert.sentAt || !alert.news || alert.news.jevP === null) continue;
        if (alert.news.jevP < JEV_ESCALATE_MIN) continue;
        queued.push({
          alertId: alert.id,
          item: {
            supplierName: supplier.name,
            summary: alert.summary,
            title: alert.news.title,
            url: alert.news.url,
            source: alert.news.source,
            jevP: alert.news.jevP,
          },
        });
      }

      if (!sendDay) continue;

      for (const news of escalations) {
        if (news.supplierKey !== key || news.jevP === null || news.jevP < JEV_ESCALATE_MIN) continue;
        if (mine.some((alert) => alert.newsItemId === news.id)) continue;
        const outcome = await summaryFor(news, supplier);
        const created = await input.store.createAlert({
          newsItemId: news.id,
          supplierId: supplier.id,
          severity: "high",
          summary: outcome.summary,
          summarySource: outcome.summarySource,
          summaryError: outcome.summaryError,
        });
        createdAlerts += 1;
        queued.push({
          alertId: created.id,
          item: {
            supplierName: supplier.name,
            summary: created.summary,
            title: news.title,
            url: news.url,
            source: news.source,
            jevP: news.jevP,
          },
        });
      }
    }

    const unique = new Map<string, AlertEmailItem>();
    for (const row of queued) unique.set(row.alertId, row.item);
    if (unique.size === 0) continue;

    const items = Array.from(unique.entries()).sort((a, b) => b[1].jevP - a[1].jevP);
    const ids = items.map(([id]) => id);
    try {
      await input.sendEmail({
        to: user.email,
        name: user.userName,
        locale: user.locale,
        items: items.map(([, item]) => item),
      });
      await input.store.markAlertsSent(ids, input.now);
      emails += 1;
      input.log(`Alert email sent to ${user.email} (${items.length} item(s))`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      input.errors.push({ scope: "email", message: `${user.email}: ${message}` });
      input.log(`Alert email failed for ${user.email}: ${message}`);
      try {
        await input.store.markAlertsEmailFailed(ids, message);
      } catch (recordError) {
        const recordMessage = recordError instanceof Error ? recordError.message : String(recordError);
        input.log(`Audit email outcome failed for ${user.email}: ${recordMessage}`);
      }
    }
  }

  return { emails, alerts: createdAlerts };

  async function summaryFor(news: StoredNewsItem, supplier: MonitoredSupplier): Promise<SummaryOutcome> {
    const cached = summaryCache.get(news.id);
    if (cached) return cached;
    const existing = await input.store.findReusableSummary(news.id);
    if (existing) {
      const outcome: SummaryOutcome = {
        summary: existing,
        summarySource: "reused",
        summaryError: null,
      };
      summaryCache.set(news.id, outcome);
      return outcome;
    }

    const facts = {
      title: news.title,
      source: news.source,
      url: news.url,
      jevP: news.jevP ?? 0,
    };
    let outcome: SummaryOutcome;
    if (llmCalls >= SUMMARY_CAP) {
      outcome = {
        summary: fallbackAlertSummary(facts),
        summarySource: "fallback",
        summaryError: null,
      };
    } else {
      llmCalls += 1;
      try {
        const text = (
          await input.summarize({
            supplierName: supplier.name,
            country: supplier.country,
            category: supplier.category,
            title: news.title,
            source: news.source,
            url: news.url,
            publishedAt: publishedLabel(news),
            jevP: news.jevP ?? 0,
          })
        ).trim();
        outcome = text
          ? { summary: text, summarySource: "perplexity", summaryError: null }
          : {
              summary: fallbackAlertSummary(facts),
              summarySource: "fallback",
              summaryError: "empty summary",
            };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        input.log(`Escalation summary failed for ${news.id}: ${message}`);
        outcome = {
          summary: fallbackAlertSummary(facts),
          summarySource: "fallback",
          summaryError: message,
        };
      }
    }
    summaryCache.set(news.id, outcome);
    return outcome;
  }
}
