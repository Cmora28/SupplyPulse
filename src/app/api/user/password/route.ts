import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validations";
import { rateLimitAsync } from "@/lib/security";
import { AuditAction } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await rateLimitAsync(`password:${session.user.id}`, 5, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many password change attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
      );
    }

    const body = await request.json();
    const validated = changePasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isCurrentValid = await bcrypt.compare(
      validated.data.currentPassword,
      user.password
    );

    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(validated.data.newPassword, 10);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    void logAudit({
      action: AuditAction.PASSWORD_CHANGE,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      request,
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
