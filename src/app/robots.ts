import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://supplypulse.net";

  return {
    rules: [
      {
        // Default rule for all crawlers (Google, Bing, etc.)
        userAgent: "*",
        allow: ["/", "/pricing", "/login", "/register"],
        disallow: ["/dashboard/", "/api/", "/_next/"],
      },
      {
        // OpenAI's ChatGPT web browsing and training crawler
        userAgent: "GPTBot",
        allow: ["/", "/pricing"],
        disallow: ["/dashboard/", "/api/"],
      },
      {
        // ChatGPT user-facing browsing
        userAgent: "ChatGPT-User",
        allow: ["/", "/pricing"],
        disallow: ["/dashboard/", "/api/"],
      },
      {
        // Anthropic's Claude crawler
        userAgent: "ClaudeBot",
        allow: ["/", "/pricing"],
        disallow: ["/dashboard/", "/api/"],
      },
      {
        // Perplexity AI crawler
        userAgent: "PerplexityBot",
        allow: ["/", "/pricing"],
        disallow: ["/dashboard/", "/api/"],
      },
      {
        // Google's AI training crawler (Gemini)
        userAgent: "Google-Extended",
        allow: ["/", "/pricing"],
        disallow: ["/dashboard/", "/api/"],
      },
      {
        // Cohere's AI crawler
        userAgent: "cohere-ai",
        allow: ["/", "/pricing"],
        disallow: ["/dashboard/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
