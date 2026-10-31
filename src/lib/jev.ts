import { classifyJevScore, type JevBand } from "@/lib/collected-signals";

/** Fixed prompt. Bump when the question or state shape changes. */
export const JEV_PROMPT_VERSION = "v1";
export const JEV_MODEL = "jev-latest";
export const JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone";

export const JEV_QUESTION =
  "Does this news item describe an event that could materially disrupt this supplier's ability to deliver goods on time, at agreed quality or price within the next 30 days (e.g. plant shutdown, strike, fire, insolvency, sanctions, port/route closure, cyberattack, major recall)? Routine corporate, marketing, earnings-beat or opinion news counts as NO.";

export interface JevNewsState {
  supplierName: string;
  country: string;
  category: string;
  title: string;
  source: string;
  published: string;
}

export type JevClassifyResult =
  | {
      ok: true;
      p: number;
      band: JevBand;
      model: string;
      promptVersion: string;
    }
  | {
      ok: false;
      reason: "missing_key" | "unauthorized" | "http_error" | "bad_response";
      message: string;
    };

function pythonString(value: string): string {
  let out = '"';
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (char === '"') out += '\\"';
    else if (char === "\\") out += "\\\\";
    else if (char === "\b") out += "\\b";
    else if (char === "\f") out += "\\f";
    else if (char === "\n") out += "\\n";
    else if (char === "\r") out += "\\r";
    else if (char === "\t") out += "\\t";
    else if (code < 0x20) out += `\\u${code.toString(16).padStart(4, "0")}`;
    else if (code > 0xffff) {
      const shifted = code - 0x10000;
      const high = 0xd800 + (shifted >> 10);
      const low = 0xdc00 + (shifted & 0x3ff);
      out += `\\u${high.toString(16).padStart(4, "0")}\\u${low.toString(16).padStart(4, "0")}`;
    } else if (code > 0x7f) out += `\\u${code.toString(16).padStart(4, "0")}`;
    else out += char;
  }
  out += '"';
  return out;
}

/** Python json.dumps defaults: spaces after separators, ensure_ascii. */
export function pythonJsonStringify(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return pythonString(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Cannot encode a non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => pythonJsonStringify(entry)).join(", ")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, entry]) => entry !== undefined
    );
    const body = entries
      .map(([key, entry]) => `${pythonString(key)}: ${pythonJsonStringify(entry)}`)
      .join(", ");
    return `{${body}}`;
  }
  throw new Error(`Cannot encode ${typeof value}`);
}

export function buildJevState(input: JevNewsState): string {
  return pythonJsonStringify({
    supplier: {
      name: input.supplierName,
      country: input.country,
      category: input.category,
    },
    news: {
      title: input.title,
      source: input.source,
      published: input.published,
    },
  });
}

export function buildJevRequestBody(input: JevNewsState): string {
  return pythonJsonStringify({
    model: JEV_MODEL,
    state: buildJevState(input),
    questions: {
      p: {
        type: "noul",
        instructions: JEV_QUESTION,
      },
    },
  });
}

function readNoul(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const answers = (payload as { answers?: unknown }).answers;
  if (!answers || typeof answers !== "object") return null;
  const p = (answers as { p?: unknown }).p;
  if (!p || typeof p !== "object") return null;
  const noul = (p as { noul?: unknown }).noul;
  const value = typeof noul === "number" ? noul : typeof noul === "string" ? Number(noul) : NaN;
  if (!Number.isFinite(value) || value < 0 || value > 1) return null;
  return value;
}

export async function classifyWithJev(
  input: JevNewsState,
  options?: { fetchImpl?: typeof fetch; apiKey?: string | null }
): Promise<JevClassifyResult> {
  const apiKey = (options && "apiKey" in options ? options.apiKey : process.env.JEV_API_KEY) ?? "";
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return {
      ok: false,
      reason: "missing_key",
      message: "JEV_API_KEY is not set",
    };
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(JEV_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${trimmed}`,
        "Content-Type": "application/json",
      },
      body: buildJevRequestBody(input),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: "http_error", message };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      reason: "unauthorized",
      message: `JEV HTTP ${response.status}`,
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      reason: "http_error",
      message: `JEV HTTP ${response.status}`,
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, reason: "bad_response", message: "JEV response was not JSON" };
  }

  const p = readNoul(payload);
  if (p === null) {
    return { ok: false, reason: "bad_response", message: "JEV response missing answers.p.noul" };
  }

  return {
    ok: true,
    p,
    band: classifyJevScore(p),
    model: JEV_MODEL,
    promptVersion: JEV_PROMPT_VERSION,
  };
}
