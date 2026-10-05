import { z } from "zod";

export type SupplierValidationInput = {
  name: string;
  country: string;
  category: string;
  leadTimeDays: number;
  cogsPercentage: number;
  shippingRoute?: string | null;
  dependencies?: string | null;
};

const issueSchema = z.object({
  field: z.string(),
  message: z.string(),
});

const validationResponseSchema = z.object({
  valid: z.boolean(),
  summary: z.string(),
  issues: z.array(issueSchema),
});

export type SupplierValidationIssue = z.infer<typeof issueSchema>;

export type SupplierValidationResult = {
  valid: boolean;
  summary: string;
  issues: SupplierValidationIssue[];
};

export class SupplierValidationServiceError extends Error {
  constructor(message = "Supplier validation service failed") {
    super(message);
    this.name = "SupplierValidationServiceError";
  }
}

const SYSTEM_PROMPT = `You are a supply chain data quality validator for SMB procurement teams. Your job is to decide whether a supplier profile is internally consistent enough for automated risk monitoring—not whether the company exists.

Rules:
- "Country" means where the supplier primarily manufactures or ships from, not where the buyer is located.
- If a shipping route is provided, its origin/lane must align with the supplier country (or the user must plausibly be describing a multi-leg route that still mentions that country).
- Flag obvious mismatches (e.g. microstate country + major Asia–US lane with no explanation).
- Flag impossible or nonsense combinations (negative lead time already blocked by app; focus on geography, route, category plausibility at a high level).
- If shipping route and dependencies are empty, judge mainly name + country + category plausibility.
- Do NOT reject merely because you cannot find the company online; reject only for logical inconsistency in the fields provided.
- Respond with ONLY valid JSON matching the schema below—no markdown, no preamble.`;

function buildUserPrompt(input: SupplierValidationInput): string {
  return `Validate this supplier profile for internal consistency.

Supplier Name: ${input.name}
Country (operations/manufacturing): ${input.country}
Product Category: ${input.category}
Lead Time (days): ${input.leadTimeDays}
COGS %: ${input.cogsPercentage}
Shipping Route: ${input.shippingRoute?.trim() || "not provided"}
Key Dependencies: ${input.dependencies?.trim() || "not provided"}

Return JSON exactly in this shape:
{
  "valid": boolean,
  "summary": "One or two sentences for the user explaining the overall result",
  "issues": [
    {
      "field": "country" | "category" | "shippingRoute" | "dependencies" | "name" | "general",
      "message": "Specific explanation the user can act on"
    }
  ]
}

Examples of invalid:
- Country Liechtenstein + Shipping Route "China to US" with no indication the supplier operates in China → valid false.
Examples of valid:
- Country China + Category Power Tools + Shipping Route "Shanghai to Los Angeles" → valid true.`;
}

function extractJson(content: string): string {
  const trimmed = content.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

async function fetchValidationCompletion(
  apiKey: string,
  userPrompt: string,
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      "https://api.perplexity.ai/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0,
          max_tokens: 512,
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new SupplierValidationServiceError(
        `Perplexity API error: ${response.status} ${errorBody}`
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new SupplierValidationServiceError("Empty response from validation API");
    }
    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseValidationResponse(content: string): SupplierValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    throw new SupplierValidationServiceError("Invalid JSON from validation API");
  }

  const result = validationResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new SupplierValidationServiceError("Validation response schema mismatch");
  }

  return {
    valid: result.data.valid,
    summary: result.data.summary,
    issues: result.data.issues,
  };
}

const VALIDATION_TIMEOUT_MS = 30_000;

export function isSupplierValidationSkipped(): boolean {
  return process.env.SUPPLIER_VALIDATION_SKIP === "true";
}

export async function validateSupplierProfile(
  input: SupplierValidationInput
): Promise<SupplierValidationResult> {
  if (isSupplierValidationSkipped()) {
    return {
      valid: true,
      summary: "Validation skipped (development).",
      issues: [],
    };
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new SupplierValidationServiceError("PERPLEXITY_API_KEY is not set");
  }

  const userPrompt = buildUserPrompt(input);
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const content = await fetchValidationCompletion(
        apiKey,
        userPrompt,
        VALIDATION_TIMEOUT_MS
      );
      return parseValidationResponse(content);
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new SupplierValidationServiceError();
}
