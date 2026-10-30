export type ReportPriorityLevel = "P1" | "P2" | "P3";

export interface RiskAssessment {
  priority: ReportPriorityLevel;
  /** 0–100. Higher means more urgent. Bands: P1 67–100, P2 34–66, P3 0–33. */
  riskScore: number;
  riskFactors: string[];
}

const BANDS: Record<ReportPriorityLevel, [number, number]> = {
  P1: [67, 100],
  P2: [34, 66],
  P3: [0, 33],
};

const DEFAULT_SCORE: Record<ReportPriorityLevel, number> = {
  P1: 85,
  P2: 50,
  P3: 15,
};

const FENCE_RE = /```[ \t]*risk-score[^\n]*\r?\n([\s\S]*?)```/gi;
const UNCLOSED_FENCE_RE = /```[ \t]*risk-score[^\n]*\r?\n([\s\S]*)$/i;
const EXPLICIT_PRIORITY_RE =
  /(?:overall\s+priority|priorit[a-zàâäéèêëíìîïóòôöúùûü]*)[^\n]{0,180}?\b(P[123])\b/i;

export type P1AlertDecision =
  | "send"
  | "skip_not_p1"
  | "skip_duplicate"
  | "skip_disabled"
  | "clear_sent";

export function decideP1Alert(input: {
  priority: ReportPriorityLevel | null;
  alertAlreadySent: boolean;
  alertsEnabled: boolean;
}): P1AlertDecision {
  if (input.priority !== "P1") {
    return input.alertAlreadySent ? "clear_sent" : "skip_not_p1";
  }
  if (!input.alertsEnabled) return "skip_disabled";
  if (input.alertAlreadySent) return "skip_duplicate";
  return "send";
}

export function riskDelta(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (current == null || previous == null) return null;
  return current - previous;
}

export function extractRiskAssessment(content: string): {
  content: string;
  assessment: RiskAssessment | null;
} {
  const peeled = peelRiskBlocks(content);
  const fromJson = parsePayloads(peeled.payloads);
  const markdown = readMarkdownSignals(peeled.stripped);
  return {
    content: peeled.stripped,
    assessment: reconcile(fromJson, markdown),
  };
}

function reconcile(
  fromJson: RiskAssessment | null,
  markdown: MarkdownSignals
): RiskAssessment | null {
  if (
    fromJson &&
    markdown.explicitPriority &&
    markdown.explicitPriority !== fromJson.priority
  ) {
    return {
      priority: markdown.explicitPriority,
      riskScore: clampToBand(fromJson.riskScore, markdown.explicitPriority),
      riskFactors: fromJson.riskFactors.length
        ? fromJson.riskFactors
        : markdown.factors,
    };
  }
  if (fromJson) return fromJson;
  if (!markdown.priority) return null;
  return {
    priority: markdown.priority,
    riskScore: DEFAULT_SCORE[markdown.priority],
    riskFactors: markdown.factors,
  };
}

function peelRiskBlocks(content: string): {
  stripped: string;
  payloads: string[];
} {
  const payloads: string[] = [];
  let matched = false;
  let stripped = content.replace(FENCE_RE, (_full, body: string) => {
    matched = true;
    payloads.push(String(body).trim());
    return "";
  });

  if (!matched) {
    const unclosed = stripped.match(UNCLOSED_FENCE_RE);
    if (unclosed && unclosed.index != null) {
      matched = true;
      payloads.push(unclosed[1].trim());
      stripped = stripped.slice(0, unclosed.index);
    }
  }

  if (!matched) {
    return peelTrailingJson(content);
  }

  stripped = stripped.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trimEnd();
  if (stripped.length > 0) stripped += "\n";
  return { stripped, payloads };
}

function peelTrailingJson(content: string): {
  stripped: string;
  payloads: string[];
} {
  const match = content.match(/\n(\{[^{}]{0,2000}\})\s*$/);
  if (!match || match.index == null) {
    return { stripped: content, payloads: [] };
  }
  const parsed = parsePayload(match[1]);
  if (!parsed) return { stripped: content, payloads: [] };
  let stripped = content.slice(0, match.index).trimEnd();
  if (stripped.length > 0) stripped += "\n";
  return { stripped, payloads: [match[1]] };
}

function parsePayloads(payloads: string[]): RiskAssessment | null {
  for (let i = payloads.length - 1; i >= 0; i--) {
    const parsed = parsePayload(payloads[i]);
    if (parsed) return parsed;
  }
  return null;
}

function parsePayload(payload: string): RiskAssessment | null {
  const start = payload.indexOf("{");
  const end = payload.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const data = JSON.parse(payload.slice(start, end + 1)) as unknown;
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    return normalizeAssessment(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

function normalizeAssessment(
  input: Record<string, unknown>
): RiskAssessment | null {
  const priority = normalizePriority(input.priority);
  const score = normalizeScore(input.riskScore);
  const riskFactors = normalizeFactors(input.riskFactors);
  if (!priority && score == null) return null;

  const resolvedPriority = priority ?? priorityForScore(score as number);
  const resolvedScore =
    score == null
      ? DEFAULT_SCORE[resolvedPriority]
      : clampToBand(score, resolvedPriority);

  return { priority: resolvedPriority, riskScore: resolvedScore, riskFactors };
}

export function normalizePriority(value: unknown): ReportPriorityLevel | null {
  if (typeof value !== "string") return null;
  const match = value.trim().toUpperCase().match(/\bP([123])\b/);
  if (!match) return null;
  return `P${match[1]}` as ReportPriorityLevel;
}

function normalizeScore(value: unknown): number | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeFactors(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const clean = item.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    out.push(clean.slice(0, 180));
    if (out.length >= 3) break;
  }
  return out;
}

function priorityForScore(score: number): ReportPriorityLevel {
  if (score >= BANDS.P1[0]) return "P1";
  if (score >= BANDS.P2[0]) return "P2";
  return "P3";
}

function clampToBand(score: number, priority: ReportPriorityLevel): number {
  const [min, max] = BANDS[priority];
  return Math.min(max, Math.max(min, score));
}

interface MarkdownSignals {
  explicitPriority: ReportPriorityLevel | null;
  priority: ReportPriorityLevel | null;
  factors: string[];
}

function readMarkdownSignals(content: string): MarkdownSignals {
  const summary = executiveSummary(content);
  const explicitPriority = normalizePriority(
    summary.match(EXPLICIT_PRIORITY_RE)?.[1]
  );
  const loosePriority = normalizePriority(summary.match(/\b(P[123])\b/i)?.[1]);
  const tableFactors = extractTableFindings(summary);
  const factors = tableFactors.length > 0 ? tableFactors : bulletFactors(summary);
  return {
    explicitPriority,
    priority: explicitPriority ?? loosePriority,
    factors,
  };
}

function executiveSummary(content: string): string {
  const idx = content.search(/\n##\s+2(?:\s|\.|\)|$)/);
  if (idx === -1) return content.slice(0, 6000);
  return content.slice(0, idx);
}

function extractTableFindings(section: string): string[] {
  const findings: string[] = [];
  for (const raw of section.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("|")) continue;
    const cells = splitRow(line);
    if (cells.length < 2) continue;
    if (!/^P[123]$/i.test(cells[0])) continue;
    const finding = stripInlineMarkdown(cells[1]);
    if (!finding || /^P[123]$/i.test(finding)) continue;
    findings.push(finding.slice(0, 180));
    if (findings.length >= 3) break;
  }
  return findings;
}

function bulletFactors(section: string): string[] {
  const out: string[] = [];
  for (const line of section.split("\n")) {
    const match = line.match(/^\s*[-*]\s+(.+)/);
    if (!match) continue;
    const text = stripInlineMarkdown(match[1]);
    if (!text) continue;
    if (/(?:overall\s+priority|priorit)/i.test(text) && /\bP[123]\b/.test(text)) {
      continue;
    }
    out.push(text.slice(0, 180));
    if (out.length >= 3) break;
  }
  return out;
}

function splitRow(line: string): string[] {
  let cells = line.split("|").map((cell) => cell.trim());
  if (cells[0] === "") cells = cells.slice(1);
  if (cells.length > 0 && cells[cells.length - 1] === "") cells = cells.slice(0, -1);
  return cells;
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
