const USER_AGENT = "SupplyPulse/1.0 (+https://supplypulse.net)";
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const DESCRIPTION_LIMIT = 500;

export interface FeedItem {
  title: string;
  url: string;
  source: string | null;
  publishedAt: Date;
  publishedRaw: string;
  description: string;
  feed: "google-news" | "gdelt";
}

function fromCodePoint(value: number): string {
  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return "";
  try {
    return String.fromCodePoint(value);
  } catch {
    return "";
  }
}

export function decodeXml(input: string): string {
  const withoutCdata = input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  return withoutCdata
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => fromCodePoint(parseInt(num, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function stripHtml(value: string): string {
  return decodeXml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagText(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return "";
  return stripHtml(match[1]);
}

function parseHttpDate(value: string, fallback: Date): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
}

export function parseGdeltSeenDate(value: string, fallback: Date): Date {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value.trim());
  if (!match) return parseHttpDate(value, fallback);
  return new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6])
    )
  );
}

export function parseGoogleNewsRss(xml: string, now: Date = new Date()): FeedItem[] {
  const items: FeedItem[] = [];
  const blocks = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks) {
    const title = tagText(block, "title");
    const url = tagText(block, "link");
    if (!title || !url) continue;
    const publishedRaw = tagText(block, "pubDate");
    const publishedAt = publishedRaw ? parseHttpDate(publishedRaw, now) : now;
    const source = tagText(block, "source") || null;
    const description = tagText(block, "description").slice(0, DESCRIPTION_LIMIT);
    items.push({
      title: title.slice(0, 500),
      url,
      source,
      publishedAt,
      publishedRaw: publishedRaw || publishedAt.toUTCString(),
      description,
      feed: "google-news",
    });
  }
  return items;
}

interface GdeltArticle {
  url?: unknown;
  title?: unknown;
  seendate?: unknown;
  domain?: unknown;
}

export function parseGdeltArticles(payload: unknown, now: Date = new Date()): FeedItem[] {
  if (!payload || typeof payload !== "object") return [];
  const articles = (payload as { articles?: unknown }).articles;
  if (!Array.isArray(articles)) return [];

  const items: FeedItem[] = [];
  for (const entry of articles) {
    if (!entry || typeof entry !== "object") continue;
    const article = entry as GdeltArticle;
    const title = typeof article.title === "string" ? article.title.trim() : "";
    const url = typeof article.url === "string" ? article.url.trim() : "";
    if (!title || !url) continue;
    const seen = typeof article.seendate === "string" ? article.seendate : "";
    const publishedAt = seen ? parseGdeltSeenDate(seen, now) : now;
    const domain = typeof article.domain === "string" ? article.domain.trim() : "";
    items.push({
      title: title.slice(0, 500),
      url,
      source: domain || null,
      publishedAt,
      publishedRaw: seen || publishedAt.toUTCString(),
      description: "",
      feed: "gdelt",
    });
  }
  return items;
}

export function googleNewsRssUrl(supplierName: string): string {
  const params = new URLSearchParams({
    q: `"${supplierName}" when:2d`,
    hl: "en-US",
    gl: "US",
    ceid: "US:en",
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

export function gdeltDocUrl(supplierName: string): string {
  const params = new URLSearchParams({
    query: `"${supplierName}"`,
    mode: "ArtList",
    maxrecords: "25",
    format: "json",
    timespan: "2d",
    sort: "datedesc",
  });
  return `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`;
}

async function fetchText(
  url: string,
  fetchImpl: typeof fetch
): Promise<string> {
  const response = await fetchImpl(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/rss+xml, application/xml, application/json, text/xml, */*",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Feed HTTP ${response.status} from ${new URL(url).hostname}`);
  }
  return response.text();
}

function isFresh(item: FeedItem, now: Date): boolean {
  return now.getTime() - item.publishedAt.getTime() <= MAX_AGE_MS;
}

export async function fetchSupplierNews(options: {
  supplierName: string;
  fetchImpl?: typeof fetch;
  now?: Date;
  logger?: (message: string) => void;
}): Promise<FeedItem[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? new Date();
  const log = options.logger ?? (() => {});
  const collected: FeedItem[] = [];

  try {
    const xml = await fetchText(googleNewsRssUrl(options.supplierName), fetchImpl);
    collected.push(...parseGoogleNewsRss(xml, now));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Google News RSS failed for "${options.supplierName}": ${message}`);
  }

  try {
    const body = await fetchText(gdeltDocUrl(options.supplierName), fetchImpl);
    const trimmed = body.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      throw new Error("GDELT returned a non-JSON body");
    }
    collected.push(...parseGdeltArticles(JSON.parse(trimmed) as unknown, now));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`GDELT failed for "${options.supplierName}": ${message}`);
  }

  return collected
    .filter((item) => isFresh(item, now))
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}
