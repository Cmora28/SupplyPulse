import type { Supplier } from "@prisma/client";
import { appendCollectedSignals, type CollectedSignal } from "@/lib/collected-signals";
import { ESCALATION_MODEL } from "@/lib/tier-limits";

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  citations?: string[];
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
};

function buildPrompt(supplier: Supplier, locale: string = "en"): string {
  const lang = LANGUAGE_NAMES[locale] || "English";
  const langInstruction =
    locale !== "en"
      ? `\n\n**IMPORTANT: Write the ENTIRE report in ${lang}. All section headers, analysis, and recommendations must be in ${lang}.**`
      : "";

  let prompt = `Provide a comprehensive weekly supply chain risk analysis report for the following supplier:

## Supplier Profile
- **Supplier Name:** ${supplier.name}
- **Country of Operation:** ${supplier.country}
- **Product Category:** ${supplier.category}
- **Lead Time:** ${supplier.leadTimeDays} days
- **Percentage of COGS:** ${supplier.cogsPercentage}%`;

  if (supplier.shippingRoute) {
    prompt += `\n- **Shipping Route:** ${supplier.shippingRoute}`;
  }

  if (supplier.dependencies) {
    prompt += `\n- **Key Dependencies:** ${supplier.dependencies}`;
  }

  prompt += `

Write a weekly supply chain risk report using **exactly** the markdown section headers below (same numbering and titles, translated to the report language if not English). Do not skip sections; if there is nothing to report, state that explicitly.

---

## 1. Executive Summary

Keep this section concise (roughly one printed page). It must stand alone for a busy executive.

- **Overall priority this week:** P1 (act now), P2 (plan this week), or P3 (monitor) for ${supplier.name}, with one sentence justification tied to ${supplier.cogsPercentage}% COGS exposure.
- **Summary table** (markdown table) with columns: **Priority** | **Finding** | **Evidence** | **Impact** | **Action this week**
  - Include 3–6 rows maximum, ordered P1 first.
  - **Evidence:** cite specific dates, figures, or events; reference sources that will appear in citations (e.g. "Reuters, 3 Oct 2026").
  - **Impact:** operational + supply/financial effect for this supplier (lead time ${supplier.leadTimeDays} days, COGS ${supplier.cogsPercentage}%).
  - **Action:** one concrete step per row (owner role optional, e.g. "Procurement", "Logistics").

---

## 2. Confirmed Risks (Past 7 Days)

Events that **already occurred** or are **officially confirmed** (regulatory filings, government notices, verified news). Each bullet must include **date** and **why it is confirmed**. If none: write "No confirmed disruptive events identified for this supplier and lane this week."

Do **not** put forecasts or speculation here.

---

## 3. Watch Signals (Early Indicators)

Leading indicators, rumors with partial corroboration, trend shifts, or metrics to monitor. Label each as **Watch** — not yet confirmed impact on ${supplier.name}. Include what would escalate a signal to P1.

If none: say so briefly.

---

## 4. Scenarios (Hypothetical — Next 30 Days)

**What-if** outcomes only. Prefix each bullet with **Scenario:** and state assumptions clearly (e.g. "If port X closes for 2 weeks…"). Include qualitative likelihood (Low / Medium / High) and suggested trigger to revisit.

Never present scenarios as facts.

---

## 5. Supply Alternatives

If ${supplier.name} or this lane fails, identify **actionable** options. Search in this order and reflect what you found:

1. **Direct / functional substitutes** — companies or products plausibly comparable to ${supplier.name} or its stated category (**${supplier.category}**).
2. **Category peers** — real manufacturers or authorized distributors that actively sell **${supplier.category}** from **${supplier.country}** or comparable export regions (Asia–Europe/US), even without customer BOM data.
3. Do **not** use this section for long RFQ process essays — those belong briefly in §6 only if needed.

Start with one short paragraph (max 3 sentences): what you searched for and whether MPN-level match was possible without specs.

Then a **markdown table** (0–5 data rows; never more than 5):

| Company | Product / offering found | Country | Website (URL) | Match grade | Verified | Compatibility & limitations | Confidence |

Column rules:
- **Match grade:** \`Exact\` | \`Functional equivalent\` | \`Category peer\` | \`Logistics-only\` (route/port — max 1 such row if relevant to ${supplier.shippingRoute || "the lane"}).
- **Verified:** \`Yes\` (public source confirms company sells this category) | \`Partial\` | \`Not confirmed\` — state what could not be verified (specs, certs, interchangeability with ${supplier.name}).
- **Website:** official company or distributor URL only from search/citations — **no invented emails or phone numbers**.
- **Compatibility & limitations:** vs ${supplier.name} — lead time vs ${supplier.leadTimeDays} days, MOQ, cert gaps, partial vs full substitute, re-qualification effort.
- **Confidence:** High | Medium | Low — each row must be defensible from citations; Low is acceptable for category peers.

**Every company row must be a real organization** supported by your sources. Prefer listing 2–4 **category peers** with Medium/Low confidence over an empty table.

**If no company rows are justified after searching:** do not fill the table with a single "Insufficient public data" row. Instead, under the table write **"Data needed to continue"** as a bullet list (max 6 bullets): e.g. manufacturer part numbers, electrical/mechanical specs, certifications, annual volume, approved equivalents, target price/lead time. Add at most **3 short bullets** on suggested RFQ next steps (max 80 words total). Do not invent company names.

---

## 6. Recommendations & Mitigations

- Inventory buffer, dual sourcing, route changes (use shipping context if relevant)
- Contract/commercial actions
- Cross-reference priorities from the Executive Summary

---

## 7. Supporting Detail (Optional)

Deeper context: financial/industry trends, capacity, pricing — only if it adds evidence not already covered above.

---

Formatting rules:
- Use markdown headers (##, ###) and bullet lists.
- Prefer specific dates, numbers, and percentages.
- Separate **confirmed facts**, **watch signals**, and **scenarios** — never merge them.${langInstruction}`;

  return prompt;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  timeoutMs: number = 300000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      // Weekly reports can take several minutes. Escalation calls pass a shorter timeout.
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      console.log(`[Perplexity] Attempt ${attempt + 1}/${maxRetries} - sending request...`);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`[Perplexity] Response status: ${response.status}`);

      if (response.ok) return response;

      // Log the actual error body for debugging
      const errorBody = await response.text().catch(() => "");
      console.error(
        `[Perplexity] API error ${response.status}: ${errorBody}`
      );

      // Don't retry on client errors (except rate limit)
      if (response.status < 500 && response.status !== 429) {
        throw new Error(
          `Perplexity API error: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      lastError = new Error(
        `Perplexity API error: ${response.status} ${response.statusText}`
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Perplexity] Attempt ${attempt + 1} error: ${lastError.message}`);
    }

    // Backoff: 10s, 20s, 40s
    if (attempt < maxRetries - 1) {
      const delay = 10000 * Math.pow(2, attempt);
      console.log(
        `[Perplexity] Retry ${attempt + 1}/${maxRetries} in ${delay / 1000}s`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Perplexity API request failed after retries");
}

export async function generateSupplierReport(
  supplier: Supplier,
  model: string = "sonar-pro",
  locale: string = "en",
  signals: CollectedSignal[] = []
): Promise<{ content: string; citations: string[] }> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY environment variable is not set");
  }

  const lang = LANGUAGE_NAMES[locale] || "English";
  console.log(`[Perplexity] Using model: ${model}, language: ${lang}`);
  const prompt = appendCollectedSignals(buildPrompt(supplier, locale), signals);

  const calibrationRules =
    "Calibration rules: (1) Confirmed risks require verifiable events in the past 7 days with dates. (2) Watch signals are not confirmed disruptions. (3) Scenarios are hypothetical and must use conditional language. (4) Do not upgrade a scenario or watch signal to confirmed without evidence. (5) Supply Alternatives: prefer verified category peers with clear Match grade and Verified status over an empty table; never invent companies, contacts, or SKUs; every listed company must trace to search evidence. (6) The Executive Summary must reflect only what is supported in the body sections.";

  const systemPrompt =
    locale !== "en"
      ? `You are an expert supply chain risk analyst. Produce executive-ready weekly reports with cited sources, clear priority (P1/P2/P3), and honest uncertainty separation. Always include specific dates, numbers, and percentages when available. ${calibrationRules} You MUST write your entire response in ${lang}.`
      : `You are an expert supply chain risk analyst. Produce executive-ready weekly reports with cited sources, clear priority (P1/P2/P3), and honest uncertainty separation. Always include specific dates, numbers, and percentages when available. ${calibrationRules}`;

  const response = await fetchWithRetry(
    "https://api.perplexity.ai/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        search_recency_filter: "week",
        return_citations: true,
        temperature: 0.2,
      }),
    }
  );

  const data: PerplexityResponse = await response.json();

  const content = data.choices?.[0]?.message?.content || "";
  const citations = data.citations || [];

  if (!content) {
    throw new Error("Empty response from Perplexity API");
  }

  return { content, citations };
}

export async function generateDisruptionAlert(input: {
  supplierName: string;
  country: string;
  category: string;
  title: string;
  source: string | null;
  url: string;
  published: string;
  jevP: number;
}): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY environment variable is not set");
  }

  const prompt = `A disruption classifier scored this public news item at ${input.jevP.toFixed(2)} (0-1) for supplier ${input.supplierName} (${input.country}, ${input.category}).

Title: ${input.title}
Source: ${input.source || "unknown"}
Published: ${input.published}
URL: ${input.url}

Write 2-4 sentences for a procurement manager:
1) what the item reports, using only this title and what you can verify from the URL,
2) how it could affect on-time delivery, quality, or price within 30 days,
3) one concrete action this week.
If you cannot verify a disruption, say the signal is unconfirmed and name what is still uncertain.
Do not invent other events, companies, or numbers. Do not write a full report.`;

  const response = await fetchWithRetry(
    "https://api.perplexity.ai/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: ESCALATION_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a supply chain risk analyst. Write a short interim alert. Separate confirmed facts from uncertainty. Never invent events.",
          },
          { role: "user", content: prompt },
        ],
        search_recency_filter: "week",
        return_citations: true,
        temperature: 0.1,
      }),
    },
    2,
    180000
  );

  const data: PerplexityResponse = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || "";
  if (!content) {
    throw new Error("Empty escalation response from Perplexity API");
  }
  const extra = (data.citations || []).filter((citation) => citation !== input.url).slice(0, 3);
  return extra.length > 0 ? `${content}\n\nSources: ${extra.join(", ")}` : content;
}
