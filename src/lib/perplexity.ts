import type { Supplier } from "@prisma/client";

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  citations?: string[];
}

function buildPrompt(supplier: Supplier): string {
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

Please analyze and report on the following areas:

## 1. Current Disruptions (Past 7 Days)
- Recent events affecting ${supplier.country} and the ${supplier.category} industry
- Port and logistics issues specific to the region
- Natural disasters, strikes, or political instability
- Regulatory changes or tariff updates

## 2. Risk Assessment
- Financial health trends for suppliers in ${supplier.country}
- Capacity constraints in the ${supplier.category} category
- Alternative supplier availability in the region
- Market price trends and volatility

## 3. Upcoming Risks (Next 30 Days)
- Predicted weather events
- Known capacity issues
- Scheduled port maintenance
- Political or regulatory changes on the horizon

## 4. Recommendations
- Immediate action items if critical risks exist
- Risk mitigation strategies specific to this supplier
- Alternative suppliers to consider
- Recommended inventory buffer adjustments

Please provide specific dates, concrete percentages where possible, and actionable intelligence for supply chain managers. Format your response with clear markdown headers and bullet points.`;

  return prompt;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      // 5 minute timeout - sonar-pro can take a while for detailed prompts
      const timeoutId = setTimeout(() => controller.abort(), 300000);

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
  model: string = "sonar-pro"
): Promise<{ content: string; citations: string[] }> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY environment variable is not set");
  }

  console.log(`[Perplexity] Using model: ${model}`);
  const prompt = buildPrompt(supplier);

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
            content:
              "You are an expert supply chain risk analyst providing detailed, actionable reports with cited sources. Always include specific dates, numbers, and percentages when available.",
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
