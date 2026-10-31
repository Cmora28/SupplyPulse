"use client";

import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";

export type StatusKind =
  | "success"
  | "warning"
  | "info"
  | "danger"
  | "neutral"
  | "premium";

export type RiskLevel = "high" | "medium" | "low";

const kindClass: Record<StatusKind, string> = {
  success: "bg-success-bg text-success border-success/20",
  warning: "bg-warning-bg text-warning border-warning/20",
  info: "bg-info-bg text-info border-info/20",
  danger: "bg-danger-bg text-danger border-danger/20",
  neutral: "bg-muted text-neutral border-border",
  premium: "bg-premium-bg text-premium border-premium/20",
};

const reportStatusKind: Record<string, StatusKind> = {
  PENDING: "warning",
  PROCESSING: "info",
  READY: "success",
  EMAILED: "success",
  SUCCESS: "success",
  FAILED: "danger",
};

const reportStatusKey: Record<string, string> = {
  PENDING: "reports.statusPending",
  PROCESSING: "reports.statusProcessing",
  READY: "reports.statusReady",
  EMAILED: "reports.statusEmailed",
  SUCCESS: "reports.statusSuccess",
  FAILED: "reports.statusFailed",
};

const tierKind: Record<string, StatusKind> = {
  FREE: "neutral",
  STANDARD: "info",
  PLUS: "premium",
  PREMIUM: "premium",
  ENTERPRISE: "warning",
};

const tierKey: Record<string, string> = {
  FREE: "common.free",
  STANDARD: "common.standard",
  PLUS: "common.plus",
  PREMIUM: "common.premium",
  ENTERPRISE: "common.enterprise",
};

const riskKind: Record<RiskLevel, StatusKind> = {
  high: "danger",
  medium: "warning",
  low: "success",
};

const riskKey: Record<RiskLevel, string> = {
  high: "dashboard.riskHigh",
  medium: "dashboard.riskMedium",
  low: "dashboard.riskLow",
};

interface StatusBadgeProps {
  status?: string;
  tier?: string;
  risk?: RiskLevel;
  className?: string;
}

export function StatusBadge({ status, tier, risk, className }: StatusBadgeProps) {
  const { t } = useTranslation();

  const kind: StatusKind = risk
    ? riskKind[risk]
    : status
      ? reportStatusKind[status] ?? "neutral"
      : tier
        ? tierKind[tier] ?? "neutral"
        : "neutral";

  const label = risk
    ? t(riskKey[risk])
    : status
      ? t(reportStatusKey[status] ?? status)
      : tier
        ? t(tierKey[tier] ?? tier)
        : "";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        kindClass[kind],
        className
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}
