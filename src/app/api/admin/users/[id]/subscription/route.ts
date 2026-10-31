import { NextResponse } from "next/server";
import { AuditAction, SubscriptionTier } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/security";
import { cuidSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  subscriptionTier: z.nativeEnum(SubscriptionTier),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;
    const admin = access.user;

    if (!cuidSchema.safeParse(params.id).success) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const rl = await rateLimitAsync(
      `admin:subscription:${admin.id}`,
      30,
      60 * 1000
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.retryAfterMs || 60000) / 1000)),
          },
        }
      );
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid tier" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
      },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { subscriptionTier } = parsed.data;
    if (target.subscriptionTier === subscriptionTier) {
      return NextResponse.json({
        user: target,
        message: "No change",
      });
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { subscriptionTier },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
      },
    });

    void logAudit({
      action: AuditAction.SUBSCRIPTION_TIER_CHANGED,
      actorUserId: admin.id,
      actorEmail: admin.email,
      request,
      targetType: "User",
      targetId: target.id,
      metadata: {
        from: target.subscriptionTier,
        to: subscriptionTier,
        source: "admin",
        targetEmail: target.email,
        targetName: target.name,
      },
    });

    return NextResponse.json({
      user: updated,
      message: "Subscription updated",
    });
  } catch (error) {
    console.error("Admin subscription update error:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}
