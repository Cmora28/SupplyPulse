import { AuditAction } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { sendP1Alert } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { decideP1Alert } from "@/lib/risk-score";

export async function notifyP1IfNeeded(input: {
  reportId: string;
  supplierName: string;
  user: {
    id: string;
    email: string;
    name: string;
    locale: string;
    p1AlertEmails: boolean;
  };
}): Promise<void> {
  try {
    await deliverP1Alert(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[P1Alert] Unexpected failure for report ${input.reportId}: ${message}`);
  }
}

async function deliverP1Alert(input: {
  reportId: string;
  supplierName: string;
  user: {
    id: string;
    email: string;
    name: string;
    locale: string;
    p1AlertEmails: boolean;
  };
}): Promise<void> {
  const report = await prisma.supplierReport.findUnique({
    where: { id: input.reportId },
    select: {
      id: true,
      supplierId: true,
      weekOf: true,
      priority: true,
      riskScore: true,
      riskFactors: true,
      p1AlertSentAt: true,
    },
  });

  if (!report) return;

  const decision = decideP1Alert({
    priority: report.priority,
    alertAlreadySent: report.p1AlertSentAt != null,
    alertsEnabled: input.user.p1AlertEmails,
  });

  if (decision === "clear_sent") {
    await prisma.supplierReport.updateMany({
      where: {
        id: report.id,
        p1AlertSentAt: { not: null },
        OR: [{ priority: null }, { priority: { in: ["P2", "P3"] } }],
      },
      data: { p1AlertSentAt: null },
    });
    console.log(`[P1Alert] Cleared sent flag for report ${report.id} (no longer P1)`);
    return;
  }

  if (decision !== "send") {
    console.log(`[P1Alert] Skip (${decision}) for report ${report.id}`);
    return;
  }

  const claimedAt = new Date();
  const claimed = await prisma.supplierReport.updateMany({
    where: { id: report.id, priority: "P1", p1AlertSentAt: null },
    data: { p1AlertSentAt: claimedAt },
  });
  if (claimed.count !== 1) {
    console.log(`[P1Alert] Skip (claim lost) for report ${report.id}`);
    return;
  }

  const prior = await prisma.supplierReport.findFirst({
    where: {
      supplierId: report.supplierId,
      weekOf: { lt: report.weekOf },
    },
    orderBy: { weekOf: "desc" },
    select: { priority: true, riskScore: true },
  });

  let sent = false;
  try {
    await sendP1Alert({
      user: { name: input.user.name, email: input.user.email },
      supplierName: input.supplierName,
      weekOf: report.weekOf,
      riskScore: report.riskScore,
      riskFactors: report.riskFactors,
      previousPriority: prior?.priority ?? null,
      previousScore: prior?.riskScore ?? null,
      locale: input.user.locale || "en",
    });
    sent = true;
    console.log(
      `[P1Alert] Sent to ${input.user.email} for "${input.supplierName}" (${report.id})`
    );
    void logAudit({
      action: AuditAction.REPORT_EMAIL_SENT,
      actorUserId: input.user.id,
      actorEmail: input.user.email,
      targetType: "SupplierReport",
      targetId: report.id,
      metadata: {
        kind: "p1_alert",
        supplierId: report.supplierId,
        supplierName: input.supplierName,
        priority: report.priority,
        riskScore: report.riskScore,
        weekOf: report.weekOf.toISOString(),
      },
    });
  } catch (error) {
    if (!sent) {
      await prisma.supplierReport.updateMany({
        where: { id: report.id, p1AlertSentAt: claimedAt },
        data: { p1AlertSentAt: null },
      });
    }
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[P1Alert] Email failed for report ${report.id}: ${message}`);
  }
}
