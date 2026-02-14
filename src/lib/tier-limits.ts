import { SubscriptionTier } from "@prisma/client";

export const TIER_LIMITS: Record<SubscriptionTier, number> = {
  FREE: 1,
  STANDARD: 5,
  PREMIUM: 20,
  ENTERPRISE: Infinity,
};

export const TIER_PRICES: Record<SubscriptionTier, string> = {
  FREE: "$0",
  STANDARD: "$49",
  PREMIUM: "$99",
  ENTERPRISE: "Custom",
};

export const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  FREE: [
    "Monitor 1 supplier",
    "Weekly AI-generated risk report",
    "Email delivery every Monday",
    "PDF download",
    "Basic email support",
  ],
  STANDARD: [
    "Monitor up to 5 suppliers",
    "Weekly AI-generated risk reports",
    "Email delivery every Monday",
    "PDF downloads with full citations",
    "Priority email support",
    "Consolidated multi-supplier PDF",
  ],
  PREMIUM: [
    "Monitor up to 20 suppliers",
    "Weekly AI-generated risk reports",
    "Email delivery every Monday",
    "PDF downloads with full citations",
    "Priority email support",
    "Consolidated multi-supplier PDF",
    "Report history archive (last 12 weeks)",
    "Export to Excel/CSV",
  ],
  ENTERPRISE: [
    "Unlimited suppliers",
    "Weekly AI-generated risk reports",
    "Email delivery every Monday",
    "PDF downloads with full citations",
    "Dedicated account manager",
    "Custom report scheduling",
    "API access for integration",
    "Custom branding on reports",
    "SSO integration",
    "Slack/Teams notifications",
    "Custom data retention policies",
  ],
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
