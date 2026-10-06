import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cuidSchema } from "@/lib/validations";
import { AuditAction } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { rateLimitAsync } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!cuidSchema.safeParse(params.id).success) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await rateLimitAsync(`report-delete:${session.user.id}`, 10, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
      );
    }

    const reportRun = await prisma.reportRun.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!reportRun) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    // Delete items first, then the run
    await prisma.reportRunItem.deleteMany({
      where: { reportRunId: reportRun.id },
    });

    await prisma.reportRun.delete({
      where: { id: reportRun.id },
    });

    void logAudit({
      action: AuditAction.REPORT_DELETE,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      request,
      targetType: "ReportRun",
      targetId: reportRun.id,
      metadata: { weekOf: reportRun.weekOf.toISOString() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete report error:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    );
  }
}
