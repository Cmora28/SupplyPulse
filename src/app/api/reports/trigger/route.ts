import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { Queue } from "bullmq";
import { startOfWeek } from "date-fns";
import { AuditAction } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

const connection = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
};

export async function POST(request: Request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;
    const admin = access.user;

    // A04: Rate limit report triggers — 3 per 10 minutes
    const rl = rateLimit(`report-trigger:${admin.id}`, 3, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many report triggers. Please wait before trying again." },
        { status: 429 }
      );
    }

    const userId = admin.id;

    // Get user's suppliers
    const suppliers = await prisma.supplier.findMany({
      where: { userId },
    });

    if (suppliers.length === 0) {
      return NextResponse.json(
        { error: "No suppliers to generate reports for" },
        { status: 400 }
      );
    }

    // Calculate current week's Monday
    const weekOf = startOfWeek(new Date(), { weekStartsOn: 1 });
    weekOf.setUTCHours(0, 0, 0, 0);

    // Create ReportRun
    const reportRun = await prisma.reportRun.create({
      data: {
        userId,
        weekOf,
        status: "PENDING",
      },
    });

    // Create ReportRunItems and enqueue jobs
    const supplierReportQueue = new Queue("supplier-report", { connection });

    for (const supplier of suppliers) {
      const item = await prisma.reportRunItem.create({
        data: {
          reportRunId: reportRun.id,
          supplierId: supplier.id,
          status: "PENDING",
        },
      });

      await supplierReportQueue.add(
        "generate-report",
        { reportRunItemId: item.id },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 30000,
          },
        }
      );
    }

    await supplierReportQueue.close();

    void logAudit({
      action: AuditAction.REPORT_TRIGGER_MANUAL,
      actorUserId: admin.id,
      actorEmail: admin.email,
      request,
      targetType: "ReportRun",
      targetId: reportRun.id,
      metadata: {
        supplierCount: suppliers.length,
        weekOf: weekOf.toISOString(),
      },
    });

    return NextResponse.json({
      message: `Report run started for ${suppliers.length} supplier(s)`,
      reportRunId: reportRun.id,
    });
  } catch (error) {
    console.error("Manual report trigger error:", error);
    return NextResponse.json(
      { error: "Failed to trigger report" },
      { status: 500 }
    );
  }
}
