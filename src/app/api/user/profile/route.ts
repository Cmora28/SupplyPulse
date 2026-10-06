import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuditAction } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { updateProfileSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateProfileSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const before = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: validated.data.name },
    });

    void logAudit({
      action: AuditAction.PROFILE_UPDATE,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      request,
      targetType: "User",
      targetId: session.user.id,
      metadata: {
        changes: {
          name: { from: before?.name, to: user.name },
        },
      },
    });

    return NextResponse.json({ name: user.name });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
