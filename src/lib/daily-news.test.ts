import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyJevScore } from "./collected-signals";
import { KEYWORD_CAP, runDailySupplierNews, type AlertEmailItem } from "./daily-news";
import type {
  ClassificationUpdate,
  DailyNewsStore,
  JevCallInsert,
  MonitoredSupplier,
  NewsAuditSink,
  NewsCandidateInsert,
  NewsInsert,
  NewsRunFinish,
  StoredAlert,
  StoredNewsItem,
} from "./daily-news-types";
import type { JevClassifyResult, JevNewsState } from "./jev";
import { newsItemExpires } from "./news-retention";
import { newsUrlHash } from "./news-url";
import { normalizeTitleForDedupe, supplierKey } from "./supplier-key";

const NOW = new Date("2026-10-31T06:00:00.000Z");
const THURSDAY = new Date("2026-10-29T06:00:00.000Z");

function supplier(partial: Partial<MonitoredSupplier> & Pick<MonitoredSupplier, "id" | "subscriptionTier">): MonitoredSupplier {
  return {
    name: "Maersk",
    country: "Denmark",
    category: "container shipping",
    userId: partial.id + "-user",
    email: `${partial.id}@example.com`,
    userName: "Ada",
    locale: "en",
    emailNotifications: true,
    reportDay: 1,
    ...partial,
  };
}

function rss(items: Array<{ title: string; link: string; date: string }>): string {
  const body = items
    .map(
      (item) => `<item>
        <title>${item.title}</title>
        <link>${item.link}</link>
        <pubDate>${item.date}</pubDate>
        <description>public report</description>
        <source url="https://www.reuters.com">Reuters</source>
      </item>`
    )
    .join("");
  return `<?xml version="1.0"?><rss><channel>${body}</channel></rss>`;
}

function memoryStore(suppliers: MonitoredSupplier[], clock: Date): DailyNewsStore & {
  news: StoredNewsItem[];
  alerts: StoredAlert[];
} {
  const news: StoredNewsItem[] = [];
  const alerts: StoredAlert[] = [];
  let seq = 0;

  const store: DailyNewsStore & { news: StoredNewsItem[]; alerts: StoredAlert[] } = {
    news,
    alerts,
    async listSuppliers() {
      return suppliers;
    },
    async findUrlHashes(supplierKey, hashes) {
      return news
        .filter((row) => row.supplierKey === supplierKey && hashes.includes(row.urlHash))
        .map((row) => row.urlHash);
    },
    async findRecentTitles(supplierKey, since) {
      return news
        .filter((row) => row.supplierKey === supplierKey && row.fetchedAt >= since)
        .map((row) => normalizeTitleForDedupe(row.title));
    },
    async insertNewsItems(rows: NewsInsert[]) {
      for (const row of rows) {
        if (news.some((item) => item.supplierKey === row.supplierKey && item.urlHash === row.urlHash)) {
          continue;
        }
        seq += 1;
        news.push({
          id: `news-${seq}`,
          supplierKey: row.supplierKey,
          urlHash: row.urlHash,
          title: row.title,
          url: row.url,
          source: row.source,
          publishedAt: row.publishedAt,
          fetchedAt: new Date(clock.getTime()),
          raw: row.raw,
          jevP: null,
          promptVersion: null,
          model: null,
          status: "new",
        });
      }
    },
    async listPendingClassification(supplierKey, limit) {
      return news
        .filter(
          (row) =>
            row.supplierKey === supplierKey &&
            row.jevP === null &&
            (row.status === "new" || row.status === "unclassified")
        )
        .sort((a, b) => b.fetchedAt.getTime() - a.fetchedAt.getTime())
        .slice(0, limit);
    },
    async saveClassification(id, data: ClassificationUpdate) {
      const row = news.find((item) => item.id === id);
      if (!row) throw new Error(`missing ${id}`);
      row.jevP = data.jevP;
      row.promptVersion = data.promptVersion;
      row.model = data.model;
      row.status = data.status;
    },
    async listEscalations(supplierKeys, since) {
      return news.filter(
        (row) =>
          supplierKeys.includes(row.supplierKey) &&
          row.status === "escalate" &&
          row.jevP !== null &&
          row.jevP >= 0.6 &&
          row.fetchedAt >= since
      );
    },
    async listAlertsForSuppliers(supplierIds) {
      return alerts
        .filter((alert) => supplierIds.includes(alert.supplierId))
        .map((alert) => ({
          ...alert,
          news: news.find((row) => row.id === alert.newsItemId) ?? null,
        }));
    },
    async findReusableSummary(newsItemId) {
      return alerts.find((alert) => alert.newsItemId === newsItemId && alert.summary)?.summary ?? null;
    },
    async createAlert(row) {
      const existing = alerts.find(
        (alert) => alert.newsItemId === row.newsItemId && alert.supplierId === row.supplierId
      );
      if (existing) return { ...existing, news: news.find((item) => item.id === row.newsItemId) ?? null };
      seq += 1;
      const created: StoredAlert = {
        id: `alert-${seq}`,
        newsItemId: row.newsItemId,
        supplierId: row.supplierId,
        severity: row.severity,
        summary: row.summary,
        sentAt: null,
        summarySource: row.summarySource ?? null,
        summaryError: row.summaryError ?? null,
        emailStatus: "pending",
        emailError: null,
        news: news.find((item) => item.id === row.newsItemId) ?? null,
      };
      alerts.push(created);
      return created;
    },
    async markAlertsSent(ids, sentAt) {
      for (const alert of alerts) {
        if (ids.includes(alert.id)) {
          alert.sentAt = sentAt;
          alert.emailStatus = "sent";
          alert.emailError = null;
        }
      }
    },
    async markAlertsEmailFailed(ids, message) {
      for (const alert of alerts) {
        if (ids.includes(alert.id)) {
          alert.emailStatus = "failed";
          alert.emailError = message;
        }
      }
    },
    async purge(cutoff) {
      const before = news.length;
      for (let i = news.length - 1; i >= 0; i -= 1) {
        const row = news[i];
        const hasAlert = alerts.some((alert) => alert.newsItemId === row.id);
        if (
          newsItemExpires(
            { fetchedAt: row.fetchedAt, jevP: row.jevP, hasAlert },
            new Date(cutoff.getTime() + 90 * 24 * 60 * 60 * 1000)
          )
        ) {
          news.splice(i, 1);
        }
      }
      return before - news.length;
    },
  };
  return store;
}

function scoreFor(title: string): number {
  const folded = title.toLowerCase();
  if (folded.includes("red sea")) return 0.91;
  if (folded.includes("restructuring")) return 0.45;
  return 0.04;
}

function classifyOk(input: JevNewsState): JevClassifyResult {
  const p = scoreFor(input.title);
  return {
    ok: true,
    p,
    band: classifyJevScore(p),
    model: "jev-latest",
    promptVersion: "v1",
  };
}

const FEED_DATE = "Fri, 30 Oct 2026 12:00:00 GMT";

function fetchImpl(extra: string = ""): typeof fetch {
  const xml = rss([
    {
      title: "Foxconn working on a new tie-up with OpenAI, says there is no AI bubble - Reuters",
      link: "https://news.google.com/rss/articles/routine",
      date: FEED_DATE,
    },
    {
      title: "Maersk suspends all Red Sea transits after attack - Reuters",
      link: "https://news.google.com/rss/articles/redsea?utm_source=rss",
      date: FEED_DATE,
    },
    {
      title: "Bosch restructuring raises strike risk - Reuters",
      link: "https://news.google.com/rss/articles/strike",
      date: FEED_DATE,
    },
    {
      title: "Bosch anuncia greve na fábrica - Publico",
      link: "https://news.google.com/rss/articles/greve",
      date: FEED_DATE,
    },
  ]);
  const gdelt = {
    articles: [
      {
        url: "https://www.reuters.com/world/maersk-red-sea",
        title: "Maersk suspends all Red Sea transits after attack",
        seendate: "20261030T120000Z",
        domain: "reuters.com",
      },
    ],
  };
  return async (url) => {
    const href = String(url);
    if (href.includes("news.google.com")) return new Response(xml + extra, { status: 200 });
    if (href.includes("gdeltproject.org")) return new Response(JSON.stringify(gdelt), { status: 200 });
    throw new Error(`unexpected URL ${href}`);
  };
}

describe("daily supplier news", () => {
  it("stores keyword hits once, scores them, and alerts only Premium on a non-Plus day", async () => {
    const premium = supplier({
      id: "a-prem",
      subscriptionTier: "PREMIUM",
      email: "prem@example.com",
      userId: "prem-user",
    });
    const free = supplier({
      id: "z-free",
      subscriptionTier: "FREE",
      email: "free@example.com",
      userId: "free-user",
      category: "logistics",
    });
    const store = memoryStore([premium, free], NOW);
    const classified: JevNewsState[] = [];
    const emails: Array<{ to: string; items: AlertEmailItem[] }> = [];
    let summaries = 0;

    const result = await runDailySupplierNews({
      store,
      now: NOW,
      fetchImpl: fetchImpl(),
      logger: () => {},
      classify: async (input) => {
        classified.push(input);
        return classifyOk(input);
      },
      summarize: async () => {
        summaries += 1;
        return "Verified Red Sea halt. Reroute this week.";
      },
      sendEmail: async (input) => {
        emails.push({ to: input.to, items: input.items });
      },
    });

    assert.equal(result.supplierKeys, 1);
    assert.equal(classified.length, 3);
    assert.ok(classified.every((call) => call.category === "container shipping"));
    assert.equal(store.news.length, 3);
    assert.equal(store.news.filter((row) => row.status === "ignored").length, 1);
    assert.equal(store.news.filter((row) => row.status === "watch").length, 1);
    assert.equal(store.news.filter((row) => row.status === "escalate").length, 1);
    assert.equal(summaries, 1);
    assert.equal(emails.length, 1);
    assert.equal(emails[0].to, "prem@example.com");
    assert.equal(emails[0].items.length, 1);
    assert.match(emails[0].items[0].summary, /Red Sea/);
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].summarySource, "perplexity");
    assert.equal(store.alerts[0].emailStatus, "sent");
    assert.ok(store.alerts[0].sentAt);

    const second = await runDailySupplierNews({
      store,
      now: NOW,
      fetchImpl: fetchImpl(),
      logger: () => {},
      classify: async () => {
        throw new Error("should not reclassify");
      },
      summarize: async () => {
        throw new Error("should not resummarize");
      },
      sendEmail: async () => {
        throw new Error("should not resend");
      },
    });
    assert.equal(second.inserted, 0);
    assert.equal(second.emails, 0);
    assert.equal(store.news.length, 3);
  });

  it("holds Plus alerts until the mid-week weekday", async () => {
    const plus = supplier({ id: "plus", subscriptionTier: "PLUS", email: "plus@example.com" });
    const store = memoryStore([plus], NOW);
    const emails: string[] = [];
    await runDailySupplierNews({
      store,
      now: NOW,
      fetchImpl: fetchImpl(),
      logger: () => {},
      classify: async (input) => classifyOk(input),
      summarize: async () => "summary",
      sendEmail: async (input) => {
        emails.push(input.to);
      },
    });
    assert.equal(emails.length, 0);
    assert.equal(store.news.some((row) => row.status === "escalate"), true);
    assert.equal(store.alerts.length, 0);

    const thursdayStore = memoryStore([plus], THURSDAY);
    await runDailySupplierNews({
      store: thursdayStore,
      now: THURSDAY,
      fetchImpl: fetchImpl(),
      logger: () => {},
      classify: async (input) => classifyOk(input),
      summarize: async () => "summary",
      sendEmail: async (input) => {
        emails.push(input.to);
      },
    });
    assert.deepEqual(emails, ["plus@example.com"]);
  });

  it("keeps collecting when JEV is missing and classifies on a later run", async () => {
    const premium = supplier({ id: "prem", subscriptionTier: "PREMIUM" });
    const store = memoryStore([premium], NOW);
    let allow = false;
    const emails: number[] = [];

    await runDailySupplierNews({
      store,
      now: NOW,
      fetchImpl: fetchImpl(),
      logger: () => {},
      classify: async (input) => {
        if (!allow) return { ok: false, reason: "missing_key", message: "JEV_API_KEY is not set" };
        return classifyOk(input);
      },
      summarize: async () => "summary",
      sendEmail: async (input) => {
        emails.push(input.items.length);
      },
    });
    assert.equal(store.news.length, 3);
    assert.ok(store.news.every((row) => row.status === "unclassified"));
    assert.equal(emails.length, 0);

    allow = true;
    await runDailySupplierNews({
      store,
      now: NOW,
      fetchImpl: fetchImpl(),
      logger: () => {},
      classify: async (input) => classifyOk(input),
      summarize: async () => "summary",
      sendEmail: async (input) => {
        emails.push(input.items.length);
      },
    });
    assert.equal(store.news.filter((row) => row.status === "escalate").length, 1);
    assert.deepEqual(emails, [1]);
  });

  it("sends a source-backed fallback when the large model fails, and retries a failed email", async () => {
    const premium = supplier({ id: "prem", subscriptionTier: "PREMIUM" });
    const store = memoryStore([premium], NOW);
    let failSend = true;
    const bodies: string[] = [];

    await runDailySupplierNews({
      store,
      now: NOW,
      fetchImpl: fetchImpl(),
      logger: () => {},
      classify: async (input) => classifyOk(input),
      summarize: async () => {
        throw new Error("perplexity down");
      },
      sendEmail: async () => {
        if (failSend) throw new Error("resend down");
      },
    });
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].sentAt, null);
    assert.equal(store.alerts[0].summarySource, "fallback");
    assert.match(store.alerts[0].summaryError ?? "", /perplexity down/);
    assert.equal(store.alerts[0].emailStatus, "failed");
    assert.match(store.alerts[0].summary, /Possible supply disruption/);

    failSend = false;
    await runDailySupplierNews({
      store,
      now: NOW,
      fetchImpl: fetchImpl(),
      logger: () => {},
      classify: async () => {
        throw new Error("should not reclassify");
      },
      summarize: async () => {
        throw new Error("should reuse summary");
      },
      sendEmail: async (input) => {
        bodies.push(input.items[0].summary);
      },
    });
    assert.match(bodies[0], /Possible supply disruption/);
    assert.ok(store.alerts[0].sentAt);
    assert.equal(store.alerts[0].emailStatus, "sent");
  });

  it("purges aged low scores and keeps escalations and recent rows", async () => {
    const store = memoryStore([], NOW);
    const old = new Date("2026-01-01T00:00:00Z");
    store.news.push(
      {
        id: "old-low",
        supplierKey: "maersk|DK",
        urlHash: "a".repeat(64),
        title: "old",
        url: "https://example.com/old",
        source: null,
        publishedAt: old,
        fetchedAt: old,
        raw: {},
        jevP: 0.1,
        promptVersion: "v1",
        model: "jev-latest",
        status: "ignored",
      },
      {
        id: "old-high",
        supplierKey: "maersk|DK",
        urlHash: "b".repeat(64),
        title: "kept",
        url: "https://example.com/high",
        source: null,
        publishedAt: old,
        fetchedAt: old,
        raw: {},
        jevP: 0.91,
        promptVersion: "v1",
        model: "jev-latest",
        status: "escalate",
      }
    );

    const result = await runDailySupplierNews({
      store,
      now: NOW,
      fetchImpl: async () => new Response("nope", { status: 500 }),
      logger: () => {},
      classify: async () => {
        throw new Error("no suppliers");
      },
      sendEmail: async () => {
        throw new Error("no suppliers");
      },
    });

    assert.equal(result.purged, 1);
    assert.deepEqual(
      store.news.map((row) => row.id),
      ["old-high"]
    );
  });
});

function recordingAudit() {
  const runs: NewsRunFinish[] = [];
  const candidates: NewsCandidateInsert[] = [];
  const calls: JevCallInsert[] = [];
  const audit: NewsAuditSink = {
    async startRun() {
      return "run-1";
    },
    async finishRun(_id, data) {
      runs.push(data);
    },
    async insertCandidates(rows) {
      candidates.push(...rows);
    },
    async insertJevCall(row) {
      calls.push(row);
    },
    async purge() {
      return 0;
    },
  };
  return { audit, runs, candidates, calls };
}

function feedResponse(items: string): typeof fetch {
  const xml = `<?xml version="1.0"?><rss><channel>${items}</channel></rss>`;
  return async (url) => {
    const href = String(url);
    if (href.includes("news.google.com")) return new Response(xml, { status: 200 });
    if (href.includes("gdeltproject.org")) {
      return new Response(JSON.stringify({ articles: [] }), { status: 200 });
    }
    throw new Error(`unexpected URL ${href}`);
  };
}

function rssItem(title: string, link: string): string {
  return `<item><title>${title}</title><link>${link}</link><pubDate>${FEED_DATE}</pubDate><description>note</description><source>Reuters</source></item>`;
}

describe("news audit trail", () => {
  it("records skip reasons and keeps going when audit writes throw", async () => {
    const store = memoryStore([supplier({ id: "free", subscriptionTier: "FREE" })], NOW);
    const strikes = Array.from({ length: KEYWORD_CAP + 1 }, (_, index) =>
      rssItem(`Plant strike number ${index}`, `https://example.com/strike-${index}`)
    );
    const xml = [
      rssItem("Plant strike with a bad link", "not a url"),
      rssItem("Maersk posts an earnings beat", "https://example.com/earnings"),
      ...strikes,
    ].join("");
    let auditCalls = 0;
    const audit: NewsAuditSink = {
      async startRun() {
        auditCalls += 1;
        throw new Error("audit down");
      },
      async finishRun() {
        throw new Error("audit down");
      },
      async insertCandidates() {
        throw new Error("audit down");
      },
      async insertJevCall() {
        throw new Error("audit down");
      },
      async purge() {
        throw new Error("audit down");
      },
    };

    const result = await runDailySupplierNews({
      store,
      audit,
      now: NOW,
      fetchImpl: feedResponse(xml),
      logger: () => {},
      classify: async () => ({
        ok: true,
        p: 0.04,
        band: "ignored",
        model: "jev-latest",
        promptVersion: "v1",
        httpStatus: 200,
        latencyMs: 8,
        attempt: 1,
      }),
      sendEmail: async () => {
        throw new Error("no email");
      },
    });

    assert.equal(auditCalls, 1);
    assert.equal(result.runId, null);
    assert.equal(result.inserted, KEYWORD_CAP);
    assert.equal(result.keywordHits, KEYWORD_CAP + 2);
    assert.equal(result.skipped, 3);
    assert.equal(store.news.length, KEYWORD_CAP);

    const recorded = recordingAudit();
    const second = await runDailySupplierNews({
      store: memoryStore([supplier({ id: "free", subscriptionTier: "FREE" })], NOW),
      audit: recorded.audit,
      now: NOW,
      fetchImpl: feedResponse(xml),
      logger: () => {},
      classify: async () => ({
        ok: true,
        p: 0.04,
        band: "ignored",
        model: "jev-latest",
        promptVersion: "v1",
      }),
      sendEmail: async () => undefined,
    });
    assert.equal(second.runId, "run-1");
    assert.equal(recorded.runs[0]?.status, "ok");
    assert.equal(recorded.runs[0]?.inserted, KEYWORD_CAP);
    const reasons = recorded.candidates.map((row) => row.skipReason).sort();
    assert.deepEqual(reasons, ["bad_url", "cap", "no_keyword"]);
    assert.equal(recorded.calls.length, KEYWORD_CAP);
    assert.equal(recorded.calls[0]?.ok, true);
    assert.equal(recorded.calls[0]?.latencyMs, null);
    assert.equal(JSON.stringify(recorded.calls[0]?.requestBody).includes("Bearer"), false);
  });

  it("records duplicate url and duplicate title skips", async () => {
    const row = supplier({ id: "free", subscriptionTier: "FREE" });
    const key = supplierKey(row.name, row.country);
    const store = memoryStore([row], NOW);
    const known = "https://example.com/known";
    store.news.push({
      id: "seed-hash",
      supplierKey: key,
      urlHash: newsUrlHash(known)!,
      title: "Unrelated headline",
      url: known,
      source: "Reuters",
      publishedAt: NOW,
      fetchedAt: NOW,
      raw: {},
      jevP: 0.1,
      promptVersion: "v1",
      model: "jev-latest",
      status: "ignored",
    });
    store.news.push({
      id: "seed-title",
      supplierKey: key,
      urlHash: newsUrlHash("https://example.com/old")!,
      title: "Warehouse strike stops shipping - BBC",
      url: "https://example.com/old",
      source: "BBC",
      publishedAt: NOW,
      fetchedAt: NOW,
      raw: {},
      jevP: 0.2,
      promptVersion: "v1",
      model: "jev-latest",
      status: "watch",
    });

    const recorded = recordingAudit();
    await runDailySupplierNews({
      store,
      audit: recorded.audit,
      now: NOW,
      fetchImpl: feedResponse(
        [
          rssItem("Dock strike halts ships - Reuters", known),
          rssItem("Warehouse strike stops shipping - Reuters", "https://example.com/fresh-title"),
          rssItem("Port strike closes the lane - Reuters", "https://example.com/fresh-port"),
        ].join("")
      ),
      logger: () => {},
      classify: async () => ({
        ok: true,
        p: 0.1,
        band: "ignored",
        model: "jev-latest",
        promptVersion: "v1",
        httpStatus: 200,
        latencyMs: 4,
        attempt: 1,
      }),
      sendEmail: async () => undefined,
    });

    const byReason = new Map(recorded.candidates.map((item) => [item.skipReason, item.url]));
    assert.equal(byReason.get("dup_hash"), known);
    assert.equal(byReason.get("dup_title"), "https://example.com/fresh-title");
    assert.equal(store.news.some((item) => item.url === "https://example.com/fresh-port"), true);
    assert.equal(recorded.calls.length, 1);
  });

  it("stores JEV success, HTTP error, and timeout without the API key", async () => {
    const recorded = recordingAudit();
    const store = memoryStore(
      [supplier({ id: "prem", subscriptionTier: "PREMIUM", email: "prem@example.com" })],
      NOW
    );
    await runDailySupplierNews({
      store,
      audit: recorded.audit,
      now: NOW,
      fetchImpl: feedResponse(
        [
          rssItem("Factory strike success case - Reuters", "https://example.com/ok"),
          rssItem("Factory strike http case - Reuters", "https://example.com/http"),
          rssItem("Factory strike timeout case - Reuters", "https://example.com/timeout"),
        ].join("")
      ),
      logger: () => {},
      classify: async (input) => {
        const body = { model: "jev-latest", questions: { p: { type: "noul" } } };
        if (input.title.includes("http")) {
          return {
            ok: false,
            reason: "http_error",
            message: "JEV HTTP 500",
            httpStatus: 500,
            latencyMs: 12,
            attempt: 1,
            requestBody: body,
            responseRaw: { text: "upstream" },
          };
        }
        if (input.title.includes("timeout")) {
          return {
            ok: false,
            reason: "timeout",
            message: "The operation was aborted due to timeout",
            httpStatus: null,
            latencyMs: 60000,
            attempt: 1,
            requestBody: body,
            responseRaw: null,
          };
        }
        return {
          ok: true,
          p: 0.91,
          band: "escalate",
          model: "jev-latest",
          promptVersion: "v1",
          httpStatus: 200,
          latencyMs: 40,
          attempt: 1,
          requestBody: body,
          responseRaw: { answers: { p: { noul: 0.91 } } },
        };
      },
      summarize: async () => "summary",
      sendEmail: async () => undefined,
    });

    const byTitle = new Map(store.news.map((row) => [row.url, row]));
    const callFor = (url: string) =>
      recorded.calls.find((call) => call.newsItemId === byTitle.get(url)?.id);
    const ok = callFor("https://example.com/ok");
    const http = callFor("https://example.com/http");
    const timeout = callFor("https://example.com/timeout");
    assert.equal(ok?.ok, true);
    assert.equal(ok?.p, 0.91);
    assert.equal(ok?.band, "escalate");
    assert.equal(ok?.httpStatus, 200);
    assert.equal(ok?.latencyMs, 40);
    assert.equal(http?.ok, false);
    assert.equal(http?.reason, "http_error");
    assert.equal(http?.httpStatus, 500);
    assert.equal(timeout?.reason, "timeout");
    assert.equal(timeout?.latencyMs, 60000);
    const serialized = JSON.stringify(recorded.calls);
    assert.equal(serialized.includes("super-secret"), false);
    assert.equal(serialized.includes("Bearer"), false);
    assert.equal(store.alerts[0]?.summarySource, "perplexity");
    assert.equal(store.alerts[0]?.emailStatus, "sent");
  });
});
