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

/** Stored response bodies are cut here so one huge payload cannot fill the audit table. */
export const JEV_RESPONSE_CAP = 8192;

export type JevFailureReason =
  | "missing_key"
  | "unauthorized"
  | "http_error"
  | "bad_response"
  | "timeout";

/** Trace fields from the HTTP call. Optional so pipeline mocks can omit them. */
export interface JevCallTrace {
  httpStatus?: number | null;
  latencyMs?: number | null;
  requestBody?: unknown;
  responseRaw?: unknown;
  attempt?: number;
}

export type JevClassifyResult =
  | ({
      ok: true;
      p: number;
      band: JevBand;
      model: string;
      promptVersion: string;
    } & JevCallTrace)
  | ({
      ok: false;
      reason: JevFailureReason;
      message: string;
    } & JevCallTrace);

export function capAuditJson(value: unknown, cap = JEV_RESPONSE_CAP): unknown {
  if (value === undefined || value === null) return null;
  let text: string;
  try {
    text = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    text = String(value);
  }
  if (text == null) return null;
  if (text.length <= cap) {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return { text: value };
      }
    }
    return value;
  }
  return { truncated: true, text: text.slice(0, cap) };
}

function scrubSecret(value: string, secret: string): string {
  if (!secret) return value;
  return value.split(secret).join("[redacted]");
}

function scrubUnknown(value: unknown, secret: string): unknown {
  if (!secret || value == null) return value;
  try {
    const text = scrubSecret(typeof value === "string" ? value : JSON.stringify(value), secret);
    if (typeof value === "string") {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return JSON.parse(text) as unknown;
  } catch {
    return value;
  }
}

export function jevRequestDocument(input: JevNewsState): unknown {
  const raw = buildJevRequestBody(input);
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { raw: raw.slice(0, JEV_RESPONSE_CAP) };
  }
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String((error as { name?: unknown }).name) : "";
  if (name === "TimeoutError" || name === "AbortError") return true;
  const message = error instanceof Error ? error.message : String(error);
  return /timeout/i.test(message);
}

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

function trace(input: {
  secret: string;
  requestBody: unknown;
  httpStatus: number | null;
  latencyMs: number;
  responseRaw: unknown;
  attempt?: number;
}): JevCallTrace {
  return {
    httpStatus: input.httpStatus,
    latencyMs: input.latencyMs,
    requestBody: capAuditJson(scrubUnknown(input.requestBody, input.secret)),
    responseRaw: capAuditJson(scrubUnknown(input.responseRaw, input.secret)),
    attempt: input.attempt ?? 1,
  };
}

async function readResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { text };
  }
}

export async function classifyWithJev(
  input: JevNewsState,
  options?: { fetchImpl?: typeof fetch; apiKey?: string | null; attempt?: number }
): Promise<JevClassifyResult> {
  const apiKey = (options && "apiKey" in options ? options.apiKey : process.env.JEV_API_KEY) ?? "";
  const trimmed = apiKey.trim();
  const requestBody = jevRequestDocument(input);
  const attempt = options?.attempt ?? 1;
  if (!trimmed) {
    return {
      ok: false,
      reason: "missing_key",
      message: "JEV_API_KEY is not set",
      ...trace({
        secret: "",
        requestBody,
        httpStatus: null,
        latencyMs: 0,
        responseRaw: null,
        attempt,
      }),
    };
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  const started = Date.now();
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
    const message = scrubSecret(error instanceof Error ? error.message : String(error), trimmed);
    const latencyMs = Date.now() - started;
    return {
      ok: false,
      reason: isTimeoutError(error) ? "timeout" : "http_error",
      message,
      ...trace({
        secret: trimmed,
        requestBody,
        httpStatus: null,
        latencyMs,
        responseRaw: null,
        attempt,
      }),
    };
  }

  const latencyMs = Date.now() - started;
  const payload = await readResponse(response).catch(() => null);
  const base = trace({
    secret: trimmed,
    requestBody,
    httpStatus: response.status,
    latencyMs,
    responseRaw: payload,
    attempt,
  });

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      reason: "unauthorized",
      message: `JEV HTTP ${response.status}`,
      ...base,
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      reason: "http_error",
      message: `JEV HTTP ${response.status}`,
      ...base,
    };
  }

  const notJson =
    payload != null &&
    typeof payload === "object" &&
    "text" in payload &&
    !("answers" in payload);
  if (payload == null || notJson) {
    return { ok: false, reason: "bad_response", message: "JEV response was not JSON", ...base };
  }

  const p = readNoul(payload);
  if (p === null) {
    return { ok: false, reason: "bad_response", message: "JEV response missing answers.p.noul", ...base };
  }

  return {
    ok: true,
    p,
    band: classifyJevScore(p),
    model: JEV_MODEL,
    promptVersion: JEV_PROMPT_VERSION,
    ...base,
  };
}
