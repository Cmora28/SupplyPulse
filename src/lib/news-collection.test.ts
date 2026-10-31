import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { appendCollectedSignals, classifyJevScore } from "./collected-signals";
import { parseGdeltArticles, parseGdeltSeenDate, parseGoogleNewsRss } from "./news-feeds";
import { newsUrlHash, normalizeNewsUrl } from "./news-url";
import { newsItemExpires, retentionCutoff, NEWS_RETENTION_DAYS } from "./news-retention";
import { matchesRiskKeyword } from "./risk-keywords";
import { countryCodesCoverCatalog, normalizeTitleForDedupe, supplierKey } from "./supplier-key";
import { isInterimAlertDay, TIER_ALERT_CADENCE } from "./tier-limits";
import sample from "./jev-sample-responses.json";

describe("supplier cache key", () => {
  it("covers every country in the product catalog", () => {
    assert.equal(countryCodesCoverCatalog(), true);
  });

  it("builds the shared Maersk key and folds diacritics", () => {
    assert.equal(supplierKey("Maersk", "Denmark"), "maersk|DK");
    assert.equal(supplierKey("Mærsk", "Denmark"), "maersk|DK");
    assert.equal(supplierKey("  Foxconn  ", "Taiwan"), "foxconn|TW");
    assert.equal(supplierKey("Bosch", "Other"), "bosch|XX");
  });

  it("strips the publisher suffix so aggregators share a title key", () => {
    assert.equal(
      normalizeTitleForDedupe("Maersk suspends all Red Sea transits after attack - Reuters"),
      normalizeTitleForDedupe("Maersk suspends all Red Sea transits after attack")
    );
  });
});

describe("news URL hash", () => {
  it("drops tracking params and is stable", () => {
    const a = normalizeNewsUrl("https://News.Google.com/rss/articles/ABC/?utm_source=x&b=2&a=1");
    const b = normalizeNewsUrl("https://news.google.com/rss/articles/ABC?a=1&b=2#section");
    assert.equal(a, b);
    assert.equal(newsUrlHash(a!), newsUrlHash(b!));
    assert.equal(newsUrlHash(a!)!.length, 64);
  });

  it("rejects non-http URLs", () => {
    assert.equal(normalizeNewsUrl("javascript:alert(1)"), null);
    assert.equal(newsUrlHash("not a url"), null);
  });
});

describe("risk keyword filter", () => {
  it("rejects the recorded routine headlines", () => {
    for (const row of sample) {
      assert.equal(matchesRiskKeyword(row.title), false, row.title);
    }
  });

  it("keeps disruption headlines in English and Portuguese", () => {
    assert.equal(
      matchesRiskKeyword("Maersk suspends all Red Sea transits after attack"),
      true
    );
    assert.equal(matchesRiskKeyword("Bosch plant strike vote at Stuttgart"), true);
    assert.equal(matchesRiskKeyword("Bosch anuncia greve na fábrica de Braga"), true);
    assert.equal(matchesRiskKeyword("Foxconn anuncia parceria com OpenAI"), false);
  });
});

describe("feed parsers", () => {
  it("reads a Google News item", () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title><![CDATA[Maersk suspends all Red Sea transits after attack - Reuters]]></title>
          <link>https://news.google.com/rss/articles/ABC?utm_source=rss</link>
          <pubDate>Fri, 30 Oct 2026 12:00:00 GMT</pubDate>
          <description>Route &amp; port risk</description>
          <source url="https://www.reuters.com">Reuters</source>
        </item>
      </channel></rss>`;
    const items = parseGoogleNewsRss(xml, new Date("2026-10-31T06:00:00Z"));
    assert.equal(items.length, 1);
    assert.equal(items[0].source, "Reuters");
    assert.equal(items[0].description, "Route & port risk");
    assert.equal(items[0].feed, "google-news");
    assert.equal(items[0].publishedAt.toISOString(), "2026-10-30T12:00:00.000Z");
  });

  it("reads GDELT seendate and articles", () => {
    const seen = parseGdeltSeenDate("20261030T120000Z", new Date(0));
    assert.equal(seen.toISOString(), "2026-10-30T12:00:00.000Z");
    const items = parseGdeltArticles(
      {
        articles: [
          {
            url: "https://www.reuters.com/world/maersk",
            title: "Maersk suspends all Red Sea transits after attack",
            seendate: "20261030T120000Z",
            domain: "reuters.com",
          },
        ],
      },
      new Date("2026-10-31T06:00:00Z")
    );
    assert.equal(items.length, 1);
    assert.equal(items[0].source, "reuters.com");
    assert.equal(items[0].feed, "gdelt");
  });
});

describe("JEV score bands", () => {
  it("applies the approved thresholds", () => {
    assert.equal(classifyJevScore(0.19), "ignored");
    assert.equal(classifyJevScore(0.2), "watch");
    assert.equal(classifyJevScore(0.59), "watch");
    assert.equal(classifyJevScore(0.6), "escalate");
    for (const row of sample) {
      assert.equal(classifyJevScore(row.p), "ignored");
    }
  });
});

describe("weekly prompt signals", () => {
  const base = "WEEKLY PROMPT";

  it("leaves the weekly prompt unchanged when nothing is worth including", () => {
    assert.equal(appendCollectedSignals(base, []), base);
    assert.equal(
      appendCollectedSignals(base, [
        {
          title: "Partnership",
          source: "Reuters",
          url: "https://example.com/a",
          publishedAt: new Date("2026-10-30T00:00:00Z"),
          jevP: 0.04,
        },
      ]),
      base
    );
  });

  it("appends watch and escalate items above the original prompt", () => {
    const next = appendCollectedSignals(base, [
      {
        title: "Strike vote",
        source: "Reuters",
        url: "https://example.com/strike",
        publishedAt: new Date("2026-10-30T00:00:00Z"),
        jevP: 0.42,
      },
      {
        title: "Port closure",
        source: null,
        url: "https://example.com/port",
        publishedAt: new Date("2026-10-30T00:00:00Z"),
        jevP: 0.91,
      },
    ]);
    assert.equal(next.startsWith(base), true);
    assert.match(next, /0\.91 escalate/);
    assert.match(next, /0\.42 watch/);
    assert.match(next, /https:\/\/example.com\/port/);
  });
});

describe("retention", () => {
  const now = new Date("2026-10-31T06:00:00Z");

  it("deletes scores below 0.6 after 90 days and keeps escalations", () => {
    const old = new Date(retentionCutoff(now).getTime() - 1000);
    const recent = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    assert.equal(newsItemExpires({ fetchedAt: old, jevP: 0.59, hasAlert: false }, now), true);
    assert.equal(newsItemExpires({ fetchedAt: old, jevP: null, hasAlert: false }, now), true);
    assert.equal(newsItemExpires({ fetchedAt: old, jevP: 0.6, hasAlert: false }, now), false);
    assert.equal(newsItemExpires({ fetchedAt: old, jevP: 0.1, hasAlert: true }, now), false);
    assert.equal(newsItemExpires({ fetchedAt: recent, jevP: 0.01, hasAlert: false }, now), false);
    assert.equal(NEWS_RETENTION_DAYS, 90);
  });
});

describe("plan cadence", () => {
  const saturday = new Date("2026-10-31T06:00:00Z");
  const thursday = new Date("2026-10-29T06:00:00Z");

  it("sends mid-week alerts from Plus up, and daily alerts on Premium and Enterprise", () => {
    assert.equal(TIER_ALERT_CADENCE.FREE, "none");
    assert.equal(TIER_ALERT_CADENCE.STANDARD, "none");
    assert.equal(TIER_ALERT_CADENCE.PLUS, "midweek");
    assert.equal(TIER_ALERT_CADENCE.PREMIUM, "daily");
    assert.equal(TIER_ALERT_CADENCE.ENTERPRISE, "daily");

    assert.equal(isInterimAlertDay("FREE", 1, thursday), false);
    assert.equal(isInterimAlertDay("STANDARD", 1, thursday), false);
    assert.equal(isInterimAlertDay("PLUS", 1, saturday), false);
    assert.equal(isInterimAlertDay("PLUS", 1, thursday), true);
    assert.equal(isInterimAlertDay("PREMIUM", 1, saturday), true);
    assert.equal(isInterimAlertDay("ENTERPRISE", 5, saturday), true);
  });
});

describe("sample file is the recorded JEV run", () => {
  it("loads the uploaded response rows", () => {
    const raw = readFileSync(new URL("./jev-sample-responses.json", import.meta.url), "utf8");
    const parsed = JSON.parse(raw) as Array<{ p: number }>;
    assert.equal(parsed.length, sample.length);
    assert.ok(parsed.length >= 20);
    assert.ok(parsed.every((row) => row.p < 0.2));
  });
});
