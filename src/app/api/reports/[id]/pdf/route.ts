import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReportPDF } from "@/lib/pdf-generator";
import { format } from "date-fns";
import { cuidSchema } from "@/lib/validations";
import type { Supplier } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // A03: Validate route parameter format
    if (!cuidSchema.safeParse(params.id).success) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reportRun = await prisma.reportRun.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
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
        { error: "Report not found" },
        { status: 404 }
      );
    }

    if (reportRun.items.length === 0) {
      return NextResponse.json(
        { error: "No successful reports available for download" },
        { status: 400 }
      );
    }

    // Load supplier reports
    const supplierReports = await Promise.all(
      reportRun.items.map(async (item: { supplierId: string; supplier: Supplier }) => {
        const report = await prisma.supplierReport.findUnique({
          where: {
            supplierId_weekOf: {
              supplierId: item.supplierId,
              weekOf: reportRun.weekOf,
            },
          },
        });

        return {
          supplier: item.supplier,
          report: report!,
        };
      })
    );

    // Filter out any missing reports
    const validReports = supplierReports.filter(
      (sr: { supplier: Supplier; report: Awaited<ReturnType<typeof prisma.supplierReport.findUnique>> }) =>
        sr.report !== null
    );

    if (validReports.length === 0) {
      return NextResponse.json(
        { error: "No report data available" },
        { status: 400 }
      );
    }

    const pdfBuffer = await generateReportPDF(
      reportRun.user,
      validReports,
      reportRun.weekOf
    );

    const filename = `supply-chain-report-${format(reportRun.weekOf, "yyyy-MM-dd")}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
