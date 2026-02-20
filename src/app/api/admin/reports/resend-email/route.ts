import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReportPDF } from "@/lib/pdf-generator";
import { sendWeeklyReport } from "@/lib/email";
import { cuidSchema } from "@/lib/validations";
import { ADMIN_EMAIL, rateLimitAsync } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await rateLimitAsync(`admin:resend:${session.user.id}`, 10, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
      );
    }

    const { reportRunId } = await request.json();
    // A03: Validate input format
    if (!reportRunId || !cuidSchema.safeParse(reportRunId).success) {
      return NextResponse.json(
        { error: "Valid reportRunId is required" },
        { status: 400 }
      );
    }

    // Find the report run with user and successful items
    const reportRun = await prisma.reportRun.findUnique({
      where: { id: reportRunId },
      include: {
        user: true,
        items: {
          where: { status: "SUCCESS" },
          include: { supplier: true },
        },
      },
    });

    if (!reportRun) {
      return NextResponse.json(
        { error: "Report run not found" },
        { status: 404 }
      );
    }

    if (reportRun.items.length === 0) {
      return NextResponse.json(
        { error: "No successful report items to send" },
        { status: 400 }
      );
    }

    // Load supplier reports for PDF generation
    const supplierReports = await Promise.all(
      reportRun.items.map(async (item) => {
        const report = await prisma.supplierReport.findUnique({
          where: {
            supplierId_weekOf: {
              supplierId: item.supplierId,
              weekOf: reportRun.weekOf,
            },
          },
        });
        return { supplier: item.supplier, report };
      })
    );

    const validReports = supplierReports.filter((sr) => sr.report !== null) as {
      supplier: (typeof reportRun.items)[0]["supplier"];
      report: NonNullable<(typeof supplierReports)[0]["report"]>;
    }[];

    if (validReports.length === 0) {
      return NextResponse.json(
        { error: "No report data available to generate PDF" },
        { status: 400 }
      );
    }

    // Generate PDF
    const userLocale = reportRun.user.locale || "en";
    console.log(
      `[Admin] Generating PDF for report run ${reportRunId} (${validReports.length} suppliers, locale: ${userLocale})`
    );
    const pdfBuffer = await generateReportPDF(
      reportRun.user,
      validReports,
      reportRun.weekOf,
      userLocale
    );

    // Send email
    console.log(
      `[Admin] Sending email to ${reportRun.user.email} for report run ${reportRunId}`
    );
    await sendWeeklyReport(
      reportRun.user,
      pdfBuffer,
      reportRun.weekOf,
      validReports.length,
      userLocale
    );

    // Update status to EMAILED
    await prisma.reportRun.update({
      where: { id: reportRunId },
      data: { status: "EMAILED" },
    });

    console.log(
      `[Admin] Email sent successfully to ${reportRun.user.email}`
    );

    return NextResponse.json({
      message: `Email sent to ${reportRun.user.email} with ${validReports.length} supplier report(s)`,
    });
  } catch (error) {
    // A09: Log full error internally but return sanitized message to client
    console.error("Admin resend-email error:", error);
    return NextResponse.json(
      { error: "Failed to send email. Check server logs for details." },
      { status: 500 }
    );
  }
}
