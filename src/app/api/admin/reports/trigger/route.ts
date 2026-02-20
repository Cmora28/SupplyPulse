import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Queue } from "bullmq";
import { startOfWeek } from "date-fns";
import { cuidSchema } from "@/lib/validations";
import { ADMIN_EMAIL, rateLimitAsync } from "@/lib/security";

export const dynamic = "force-dynamic";

const connection = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await rateLimitAsync(`admin:trigger:${session.user.id}`, 10, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
      );
    }

    const { userId } = await request.json();
    // A03: Validate input format
    if (!userId || !cuidSchema.safeParse(userId).success) {
      return NextResponse.json(
        { error: "Valid userId is required" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's suppliers
    const suppliers = await prisma.supplier.findMany({
      where: { userId },
    });

    if (suppliers.length === 0) {
      // A09: Don't expose user details in error messages
      return NextResponse.json(
        { error: "This user has no suppliers to generate reports for" },
        { status: 400 }
      );
    }

    // Calculate current week's Monday
    const weekOf = startOfWeek(new Date(), { weekStartsOn: 1 });
    weekOf.setUTCHours(0, 0, 0, 0);

    // Create ReportRun for that user
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
          backoff: { type: "exponential", delay: 30000 },
        }
      );
    }

    await supplierReportQueue.close();

    return NextResponse.json({
      message: `Report run started for ${user.name} (${suppliers.length} supplier(s))`,
      reportRunId: reportRun.id,
    });
  } catch (error) {
    console.error("Admin report trigger error:", error);
    return NextResponse.json(
      { error: "Failed to trigger report" },
      { status: 500 }
    );
  }
}
