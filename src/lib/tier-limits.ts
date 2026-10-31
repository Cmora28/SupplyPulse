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
  STANDARD: "$29.99",
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
    "Mid-week disruption alerts between weekly reports",
  ],
  PREMIUM: [
    "Monitor up to 15 suppliers",
    "Deep Research AI reports — 10x more detailed analysis",
    "In-depth geopolitical and financial risk intelligence",
    "Email delivery every Monday",
    "PDF downloads with full citations",
    "Priority email support",
    "Consolidated multi-supplier PDF",
    "Daily disruption alerts between weekly reports",
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
    "Daily disruption alerts between weekly reports",
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

/**
 * Interim disruption alerts between weekly reports.
 * Free and Standard stay on the weekly report only.
 * Plus sends once mid-week (three days after the user's report weekday, UTC).
 * Premium and Enterprise send every day a new severe item is waiting.
 */
export type AlertCadence = "none" | "midweek" | "daily";

export const TIER_ALERT_CADENCE: Record<SubscriptionTier, AlertCadence> = {
  FREE: "none",
  STANDARD: "none",
  PLUS: "midweek",
  PREMIUM: "daily",
  ENTERPRISE: "daily",
};

/** Large model used when a JEV score is high enough to escalate. */
export const ESCALATION_MODEL = "sonar-deep-research";

export function isInterimAlertDay(
  tier: SubscriptionTier,
  reportDay: number,
  now: Date
): boolean {
  const cadence = TIER_ALERT_CADENCE[tier];
  if (cadence === "none") return false;
  if (cadence === "daily") return true;
  const weekday = ((reportDay % 7) + 7) % 7;
  const midweek = (weekday + 3) % 7;
  return now.getUTCDay() === midweek;
}

export function getSupplierLimit(tier: SubscriptionTier): number {
  return TIER_LIMITS[tier];
}

export function canAddSupplier(
  tier: SubscriptionTier,
  currentCount: number
): boolean {
  return currentCount < TIER_LIMITS[tier];
}
