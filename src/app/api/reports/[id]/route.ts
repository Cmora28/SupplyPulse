import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cuidSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function DELETE(
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete report error:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    );
  }
}
