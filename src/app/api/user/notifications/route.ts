import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuditAction } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { notificationSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = notificationSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const before = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailNotifications: true, p1AlertEmails: true },
    });

    const data: { emailNotifications?: boolean; p1AlertEmails?: boolean } = {};
    if (validated.data.emailNotifications !== undefined) {
      data.emailNotifications = validated.data.emailNotifications;
    }
    if (validated.data.p1AlertEmails !== undefined) {
      data.p1AlertEmails = validated.data.p1AlertEmails;
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { emailNotifications: true, p1AlertEmails: true },
    });

    void logAudit({
      action: AuditAction.NOTIFICATIONS_UPDATE,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      request,
      metadata: {
        changes: {
          ...(data.emailNotifications !== undefined
            ? {
                emailNotifications: {
                  from: before?.emailNotifications,
                  to: data.emailNotifications,
                },
              }
            : {}),
          ...(data.p1AlertEmails !== undefined
            ? {
                p1AlertEmails: {
                  from: before?.p1AlertEmails,
                  to: data.p1AlertEmails,
                },
              }
            : {}),
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Notification update error:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
