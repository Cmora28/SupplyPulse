import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/security";

const MAX_METADATA_STRING = 500;
const MAX_USER_AGENT = 512;

export type AuditFeature =
  | "auth"
  | "suppliers"
  | "reports"
  | "settings"
  | "billing"
  | "admin"
  | "support";

export const AUDIT_FEATURES: Record<AuditFeature, AuditAction[]> = {
  auth: [
    AuditAction.LOGIN_SUCCESS,
    AuditAction.LOGIN_FAILURE,
    AuditAction.LOGOUT,
    AuditAction.REGISTER,
    AuditAction.PASSWORD_RESET_REQUEST,
    AuditAction.PASSWORD_RESET_COMPLETE,
  ],
  suppliers: [
    AuditAction.SUPPLIER_CREATE,
    AuditAction.SUPPLIER_UPDATE,
    AuditAction.SUPPLIER_DELETE,
    AuditAction.SUPPLIER_VALIDATION_REJECTED,
  ],
  reports: [
    AuditAction.REPORT_TRIGGER_MANUAL,
    AuditAction.REPORT_TRIGGER_SCHEDULED,
    AuditAction.REPORT_TRIGGER_ADMIN,
    AuditAction.REPORT_DELETE,
    AuditAction.REPORT_FINALIZED,
    AuditAction.REPORT_EMAIL_SENT,
  ],
  settings: [
    AuditAction.PASSWORD_CHANGE,
    AuditAction.PROFILE_UPDATE,
    AuditAction.LOCALE_CHANGE,
    AuditAction.NOTIFICATIONS_UPDATE,
    AuditAction.REPORT_SCHEDULE_SET,
    AuditAction.ACCOUNT_DELETE,
  ],
  billing: [AuditAction.SUBSCRIPTION_TIER_CHANGED],
  admin: [AuditAction.ADMIN_RESEND_REPORT_EMAIL],
  support: [AuditAction.SUPPORT_SUBMIT],
};

export type LogAuditParams = {
  action: AuditAction;
  success?: boolean;
  actorUserId?: string | null;
  actorEmail?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  request?: Request | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function truncate(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > MAX_METADATA_STRING
      ? `${value.slice(0, MAX_METADATA_STRING)}…`
      : value;
  }
  return value;
}

export function formatAuditMetadata(
  metadata: Record<string, unknown> | null | undefined
): Prisma.InputJsonValue | undefined {
  if (!metadata || Object.keys(metadata).length === 0) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) continue;
    out[key] = truncate(value);
  }
  return out as Prisma.InputJsonValue;
}

export function getAuditContext(request?: Request | null): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  if (!request) {
    return { ipAddress: null, userAgent: null };
  }
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent");
  return {
    ipAddress: ip === "unknown" ? null : ip,
    userAgent: ua ? ua.slice(0, MAX_USER_AGENT) : null,
  };
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const ctx = getAuditContext(params.request);
    const actorEmail = params.actorEmail?.toLowerCase().trim() || null;

    await prisma.auditEvent.create({
      data: {
        action: params.action,
        success: params.success ?? true,
        actorUserId: params.actorUserId ?? null,
        actorEmail,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        metadata: formatAuditMetadata(params.metadata ?? undefined),
        ipAddress: params.ipAddress ?? ctx.ipAddress,
        userAgent: params.userAgent ?? ctx.userAgent,
      },
    });
  } catch (error) {
    console.error("[Audit] Failed to write event:", error);
  }
}

type FieldChange = { from: unknown; to: unknown };

export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys: string[]
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {};
  for (const key of keys) {
    const fromVal = before[key];
    const toVal = after[key];
    if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
      changes[key] = {
        from: truncate(fromVal),
        to: truncate(toVal),
      };
    }
  }
  return changes;
}

const SUPPLIER_DIFF_KEYS = [
  "name",
  "country",
  "category",
  "leadTimeDays",
  "cogsPercentage",
  "shippingRoute",
  "dependencies",
];

export function diffSupplierFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, FieldChange> {
  return diffFields(before, after, SUPPLIER_DIFF_KEYS);
}

export function actionsForFeature(feature: string | null): AuditAction[] | undefined {
  if (!feature) return undefined;
  if (feature in AUDIT_FEATURES) {
    return AUDIT_FEATURES[feature as AuditFeature];
  }
  return undefined;
}

export function parseAuditCursor(cursor: string | null): {
  createdAt: Date;
  id: string;
} | null {
  if (!cursor) return null;
  const sep = cursor.indexOf("_");
  if (sep <= 0) return null;
  const iso = cursor.slice(0, sep);
  const id = cursor.slice(sep + 1);
  const createdAt = new Date(iso);
  if (Number.isNaN(createdAt.getTime()) || !id) return null;
  return { createdAt, id };
}

export function encodeAuditCursor(createdAt: Date, id: string): string {
  return `${createdAt.toISOString()}_${id}`;
}
