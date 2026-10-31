export type RiskLevel = "high" | "medium" | "low";

export interface SupplierRisk {
  level: RiskLevel;
  /** Short finding from the executive-summary table, when one is present. */
  summary: string | null;
}

const PRIORITY: Record<string, RiskLevel> = {
  "1": "high",
  "2": "medium",
  "3": "low",
};

const MAX_SUMMARY = 180;

function cleanFinding(raw: string): string {
  const text = raw
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[\d+\]/g, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= MAX_SUMMARY) return text;
  return `${text.slice(0, MAX_SUMMARY - 1).trimEnd()}…`;
}

/**
 * Pull the top priority and its finding from a generated supplier report.
 * Reports use a markdown table whose first column is P1, P2, or P3.
 * Returns a low level and no summary when nothing structured is present.
 */
export function extractSupplierRisk(
  content: string | null | undefined
): SupplierRisk {
  if (!content) return { level: "low", summary: null };

  const rank: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
  const table = /\|\s*P([123])\s*\|\s*([^|\n]+)/g;
  let best: SupplierRisk | null = null;
  let row: RegExpExecArray | null;
  while ((row = table.exec(content)) !== null) {
    const level = PRIORITY[row[1]];
    const summary = cleanFinding(row[2]);
    if (!summary) continue;
    if (!best || rank[level] < rank[best.level]) best = { level, summary };
    if (level === "high") break;
  }
  if (best) return best;

  const overall = content.match(/\bP([123])\b/);
  if (overall) return { level: PRIORITY[overall[1]], summary: null };

  return { level: "low", summary: null };
}
