import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Queue } from "bullmq";
import { startOfWeek } from "date-fns";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "lopezhk@gmail.com";

const connection = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
};

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow the admin user
    if (session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // A04: Rate limit report triggers — 3 per 10 minutes
    const rl = rateLimit(`report-trigger:${session.user.id}`, 3, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many report triggers. Please wait before trying again." },
        { status: 429 }
      );
    }

    const userId = session.user.id;

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
