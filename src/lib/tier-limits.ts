import { SubscriptionTier } from "@prisma/client";

export const TIER_LIMITS: Record<SubscriptionTier, number> = {
  FREE: 1,
  STANDARD: 5,
  PLUS: 5,
  PREMIUM: 15,
  ENTERPRISE: Infinity,
};

export const TIER_PRICES: Record<SubscriptionTier, string> = {
  FREE: "$0",
  STANDARD: "$29",
  PLUS: "$79.99",
  PREMIUM: "$199.99",
  ENTERPRISE: "Custom",
};

export const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  FREE: [
    "Monitor 1 supplier",
    "Weekly AI risk report",
    "Email delivery every Monday",
    "PDF download",
    "Basic email support",
  ],
  STANDARD: [
    "Monitor up to 5 suppliers",
    "Weekly AI risk reports",
    "Email delivery every Monday",
    "PDF downloads with full citations",
    "Priority email support",
    "Consolidated multi-supplier PDF",
  ],
  PLUS: [
    "Monitor up to 5 suppliers",
    "Deep Research AI reports — 10x more detailed analysis",
    "In-depth geopolitical and financial risk intelligence",
    "Multi-source intelligence with cited evidence",
    "Weekly email delivery",
    "PDF downloads with full citations",
    "Priority email support",
    "Consolidated multi-supplier PDF",
  ],
  PREMIUM: [
    "Monitor up to 15 suppliers",
    "Deep Research AI reports — 10x more detailed analysis",
    "In-depth geopolitical and financial risk intelligence",
    "Email delivery every Monday",
    "PDF downloads with full citations",
    "Priority email support",
    "Consolidated multi-supplier PDF",
  ],
  ENTERPRISE: [
    "Custom number of suppliers",
    "Deep Research AI — 10x more detailed reports",
    "In-depth geopolitical and financial risk intelligence",
    "Multi-source intelligence with cited evidence",
    "Weekly email delivery",
    "PDF downloads with full citations",
    "Priority email support",
    "Consolidated multi-supplier PDF",
  ],
};

// Which Perplexity model to use per tier
export const TIER_MODEL: Record<SubscriptionTier, string> = {
  FREE: "sonar-pro",
  STANDARD: "sonar-pro",
  PLUS: "sonar-deep-research",
  PREMIUM: "sonar-deep-research",
  ENTERPRISE: "sonar-deep-research",
};

export function getSupplierLimit(tier: SubscriptionTier): number {
  return TIER_LIMITS[tier];
}

export function canAddSupplier(
  tier: SubscriptionTier,
  currentCount: number
): boolean {
  return currentCount < TIER_LIMITS[tier];
}
