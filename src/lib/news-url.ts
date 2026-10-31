import { createHash } from "node:crypto";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
]);

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Canonical http(s) URL. Tracking params and fragments are removed. */
export function normalizeNewsUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();

  const kept = Array.from(parsed.searchParams.entries()).filter(
    ([key]) => !TRACKING_PARAMS.has(key.toLowerCase())
  );
  kept.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  parsed.search = "";
  for (const [key, value] of kept) {
    parsed.searchParams.append(key, value);
  }

  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  return parsed.toString();
}

export function newsUrlHash(raw: string): string | null {
  const normalized = normalizeNewsUrl(raw);
  if (!normalized) return null;
  return sha256Hex(normalized);
}
